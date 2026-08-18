"use server";

import { revalidatePath } from "next/cache";
import { postgresPool } from "@/infrastructure/db/postgres";
import { createSupabaseServiceClient, requireAdminViewer } from "@/infrastructure/auth/pintofruta-auth";
import { ensureSiteContentSchema } from "@/infrastructure/db/ensure-site-content-schema";
import { normalizeText } from "@/lib/catalog";
import { resolveCategoryIconKey } from "@/lib/category-icons";
import type { AdminTableKey } from "@/application/admin-crud";
import type { PoolClient } from "pg";

type PayloadRecord = Record<string, string | number | boolean | null | undefined>;

function adminLog(stage: string, details: Record<string, unknown> = {}) {
  console.info(`[admin-action] ${stage}`, details);
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return value === "true" || value === "on" || value === "1";
  }

  return false;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringValue(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function slugify(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseNumberArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => toNumber(item)).filter((item) => Number.isFinite(item) && item > 0);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toNumber(item)).filter((item) => Number.isFinite(item) && item > 0);
      }
    } catch {
      return value
        .split(",")
        .map((item) => toNumber(item.trim()))
        .filter((item) => Number.isFinite(item) && item > 0);
    }
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return [value];
  }

  return [];
}

function parseStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toStringValue(item)).filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => toStringValue(item))
        .filter(Boolean);
    }
  }

  return [];
}

function parseTemplateRowMap(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, currentValue]) => {
        const rowNumber = Math.floor(toNumber(currentValue));
        if (key && rowNumber > 0) {
          acc[key] = rowNumber;
        }
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, currentValue]) => {
      const rowNumber = Math.floor(toNumber(currentValue));
      if (key && rowNumber > 0) {
        acc[key] = rowNumber;
      }
      return acc;
    }, {});
  }

  return {};
}

function generateSku(id: number) {
  return `PF${String(id).padStart(4, "0")}`;
}

function isFileValue(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isTransientConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("connection closed") ||
    message.includes("connection terminated unexpectedly") ||
    message.includes("terminating connection") ||
    message.includes("socket hang up") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("enetunreach")
  );
}

type PackItemDraft = {
  productId: number;
  quantity: number;
  order: number;
};

type FabricVariantDraft = {
  fabricId: number;
  image: string;
  order: number;
};

function getJsonPayload(formData: FormData): PayloadRecord {
  const raw = formData.get("payload_json");

  if (typeof raw !== "string" || !raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as PayloadRecord;
  } catch {
    return {};
  }
}

async function ensureDatabase() {
  if (!postgresPool) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  await ensureSiteContentSchema();
}

async function nextNumericId(table: string) {
  const result = await postgresPool!.query<{ next_id: number }>(`select coalesce(max(id), 0) + 1 as next_id from ${table}`);
  return result.rows[0]?.next_id ?? 1;
}

async function resolveTextId(table: string, providedId: string, fallbackParts: string[]) {
  const normalized = toStringValue(providedId);
  if (normalized) {
    return normalized;
  }

  const generated = slugify(fallbackParts.filter(Boolean).join("-"));
  if (generated) {
    return generated;
  }

  const nextId = await nextNumericId(table);
  return String(nextId);
}

async function saveBrand(record: PayloadRecord) {
  const name = toStringValue(record.name);
  const code = toStringValue(record.code) || slugify(name);
  const id = await resolveTextId("brands", toStringValue(record.id), [toStringValue(record.id), code, name]);
  const existingResult = await postgresPool!.query<{ featured: boolean | null }>(
    "select featured from brands where id = $1 limit 1",
    [id],
  );
  const existing = existingResult.rows[0];
  const featured = existing?.featured ?? false;
  await postgresPool!.query(
    `
      insert into brands (id, code, name, image, featured)
      values ($1, $2, $3, $4, $5)
      on conflict (id) do update set
        code = excluded.code,
        name = excluded.name,
        image = excluded.image,
        featured = excluded.featured
    `,
    [id, code || id, name, toStringValue(record.image) || null, featured],
  );
}

async function saveFabric(record: PayloadRecord) {
  const id = record.id ? toNumber(record.id) : await nextNumericId("fabrics");
  const name = toStringValue(record.name);

  if (!name) {
    throw new Error("La tela necesita un nombre.");
  }

  const image = toStringValue(record.image) || null;

  await postgresPool!.query(
    `
      insert into fabrics (id, name, image)
      values ($1, $2, $3)
      on conflict (id) do update set
        name = excluded.name,
        image = excluded.image,
        updated_at = now()
    `,
    [id, name, image],
  );
}

async function saveCategory(record: PayloadRecord) {
  const id = record.id ? toNumber(record.id) : await nextNumericId("categories");
  const name = toStringValue(record.name);
  const slug = toStringValue(record.slug) || slugify(name);
  const icon = toStringValue(record.icon) || resolveCategoryIconKey(name);
  const homeMenu =
    record.homeMenu == null || record.homeMenu === "" ? true : toBoolean(record.homeMenu);

  await postgresPool!.query(
    `
      insert into categories (id, name, slug, visible, home_menu, icon)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (id) do update set
        name = excluded.name,
        slug = excluded.slug,
        visible = excluded.visible,
        home_menu = excluded.home_menu,
        icon = excluded.icon
    `,
    [id, name, slug, toBoolean(record.visible), homeMenu, icon],
  );
}

type AuthAdminUser = {
  id: string;
  email?: string | null;
};

async function findAuthUserByEmail(email: string) {
  const supabase = createSupabaseServiceClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const found = data.users.find((user) => String(user.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) {
      return found as AuthAdminUser;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function upsertAuthUser(email: string, password: string, existingAuthUserId?: string | null) {
  const supabase = createSupabaseServiceClient();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();
  let authUserId = existingAuthUserId ?? null;

  if (!authUserId) {
    const existingAuthUser = await findAuthUserByEmail(normalizedEmail);
    authUserId = existingAuthUser?.id ?? null;
  }

  if (!authUserId) {
    if (!normalizedPassword) {
      throw new Error("La contraseña es obligatoria para crear un usuario.");
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(error?.message || "No se pudo crear el usuario de acceso.");
    }

    return data.user.id;
  }

  const updatePayload: { email?: string; password?: string; email_confirm?: boolean } = {
    email: normalizedEmail,
    email_confirm: true,
  };

  if (normalizedPassword) {
    updatePayload.password = normalizedPassword;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(authUserId, updatePayload);

  if (error || !data.user) {
    throw new Error(error?.message || "No se pudo actualizar el usuario de acceso.");
  }

  return data.user.id;
}

async function saveUser(record: PayloadRecord) {
  const id = record.id ? toNumber(record.id) : await nextNumericId("users");
  const existingResult = await postgresPool!.query<{
    auth_user_id: string | null;
    email: string;
  }>("select auth_user_id, email from users where id = $1 limit 1", [id]);
  const existing = existingResult.rows[0];
  const rawRole = toStringValue(record.role);
  const normalizedRole = (() => {
    const value = rawRole.toLowerCase();
    if (value === "admin" || value === "administrador") {
      return "Administrador";
    }
    if (value === "customer" || value === "client" || value === "cliente") {
      return "Cliente";
    }
    return rawRole || "Cliente";
  })();
  const password = toStringValue(record.password);
  const authUserId = await upsertAuthUser(toStringValue(record.email), password, existing?.auth_user_id);

  await postgresPool!.query(
    `
      insert into users (id, auth_user_id, name, email, role, can_see_prices, active)
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (id) do update set
        auth_user_id = excluded.auth_user_id,
        name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        can_see_prices = excluded.can_see_prices,
        active = excluded.active
    `,
    [
      id,
      authUserId,
      toStringValue(record.name),
      toStringValue(record.email),
      normalizedRole,
      toBoolean(record.canSeePrices),
      toBoolean(record.active),
    ],
  );
}

async function saveHeroSlide(record: PayloadRecord) {
  const id = record.id ? toNumber(record.id) : await nextNumericId("hero_slides");
  await postgresPool!.query(
    `
      insert into hero_slides (
        id, order_index, title, subtitle, badge, image, image_mobile, link, active, home_spotlight
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      on conflict (id) do update set
        order_index = excluded.order_index,
        title = excluded.title,
        subtitle = excluded.subtitle,
        badge = excluded.badge,
        image = excluded.image,
        image_mobile = excluded.image_mobile,
        link = excluded.link,
        active = excluded.active,
        home_spotlight = excluded.home_spotlight
    `,
    [
      id,
      toNumber(record.order),
      toStringValue(record.title),
      toStringValue(record.subtitle),
      toStringValue(record.badge),
      toStringValue(record.image),
      toStringValue(record.imageMobile) || null,
      toStringValue(record.link),
      toBoolean(record.active),
      record.homeSpotlight == null || record.homeSpotlight === "" ? null : toBoolean(record.homeSpotlight),
    ],
  );
}

async function saveBanner(record: PayloadRecord) {
  const id = record.id ? toNumber(record.id) : await nextNumericId("banners");
  await postgresPool!.query(
    `
      insert into banners (id, text, order_index, active)
      values ($1, $2, $3, $4)
      on conflict (id) do update set
        text = excluded.text,
        order_index = excluded.order_index,
        active = excluded.active
    `,
    [id, toStringValue(record.text), toNumber(record.order), toBoolean(record.active)],
  );
}

function parsePackItems(value: unknown): PackItemDraft[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const candidate = item as Record<string, unknown>;
        const productId = toNumber(candidate.productId);
        const quantity = Math.max(1, toNumber(candidate.quantity) || 1);
        const order = Math.max(1, toNumber(candidate.order) || index + 1);

        if (!productId) {
          return null;
        }

        return { productId, quantity, order };
      })
      .filter((item): item is PackItemDraft => Boolean(item))
      .sort((left, right) => left.order - right.order);
  } catch {
    return [];
  }
}

function parseFabricVariants(value: unknown): FabricVariantDraft[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const candidate = item as Record<string, unknown>;
        const fabricId = toNumber(candidate.fabricId);
        const image = toStringValue(candidate.image);
        const order = Math.max(1, toNumber(candidate.order) || index + 1);

        if (!fabricId || !image) {
          return null;
        }

        return { fabricId, image, order };
      })
      .filter((item): item is FabricVariantDraft => Boolean(item))
      .sort((left, right) => left.order - right.order);
  } catch {
    return [];
  }
}

async function savePack(record: PayloadRecord, formData: FormData) {
  const id = record.id ? toNumber(record.id) : await nextNumericId("promotion_packs");
  const title = toStringValue(record.title);
  const apodo = toStringValue(record.apodo) || slugify(title);
  const items = parsePackItems(record.items_json);
  const image = toStringValue(record.image) || null;

  adminLog("pack:save-start", {
    id,
    title,
    apodo,
    itemsCount: items.length,
    hasImageUrl: Boolean(image),
  });

  if (!title) {
    throw new Error("El pack necesita un título.");
  }

  if (toNumber(record.publicPrice) <= 0) {
    throw new Error("El pack necesita un precio final válido.");
  }

  if (items.length === 0) {
    throw new Error("El pack debe incluir al menos un producto.");
  }

  if (!image) {
    throw new Error("La promoción necesita una imagen.");
  }

  const runTransaction = async (client: PoolClient) => {
    adminLog("pack:transaction-begin", { id, title, apodo, itemsCount: items.length });
    await client.query("begin");

    try {
      adminLog("pack:upsert-pack", { id, title, apodo, imageType: image.startsWith("data:") ? "data-url" : "path" });
      await client.query(
        `
          insert into promotion_packs (
            id, apodo, title, description, category, public_price, image, active, featured, order_index
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          on conflict (id) do update set
            apodo = excluded.apodo,
            title = excluded.title,
            description = excluded.description,
            category = excluded.category,
            public_price = excluded.public_price,
            image = excluded.image,
            active = excluded.active,
            featured = excluded.featured,
            order_index = excluded.order_index,
            updated_at = now()
        `,
        [
          id,
          apodo,
          title,
          toStringValue(record.description),
          toStringValue(record.category),
          toNumber(record.publicPrice),
          image,
          toBoolean(record.active),
          toBoolean(record.featured),
          toNumber(record.order),
        ],
      );

      await client.query("delete from promotion_pack_items where pack_id = $1", [id]);
      adminLog("pack:cleared-items", { id });

      for (const item of items) {
        adminLog("pack:insert-item", {
          id,
          productId: item.productId,
          quantity: item.quantity,
          order: item.order,
        });
        await client.query(
          `
            insert into promotion_pack_items (pack_id, product_id, quantity, order_index)
            values ($1, $2, $3, $4)
          `,
          [id, item.productId, item.quantity, item.order],
        );
      }

      await client.query("commit");
      adminLog("pack:transaction-commit", { id, title, apodo, itemsCount: items.length });
    } catch (error) {
      adminLog("pack:transaction-error", {
        id,
        title,
        apodo,
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        await client.query("rollback");
      } catch {
        // Si la conexión ya se cerró, dejamos que el error original suba.
      }

      throw error;
    }
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    adminLog("pack:connect-attempt", { id, attempt: attempt + 1 });
    const client = await postgresPool!.connect();

    try {
      await runTransaction(client);
      return;
    } catch (error) {
      adminLog("pack:attempt-failed", {
        id,
        attempt: attempt + 1,
        error: error instanceof Error ? error.message : String(error),
      });
      if (!isTransientConnectionError(error) || attempt === 1) {
        throw error;
      }

      await postgresPool!.end().catch(() => undefined);
      adminLog("pack:pool-reset-after-transient-error", { id, attempt: attempt + 1 });
      continue;
    } finally {
      client.release();
    }
  }
}

async function saveProductLot(record: PayloadRecord) {
  const providedId = record.id == null || record.id === "" ? 0 : toNumber(record.id);
  const existingResult = providedId
    ? await postgresPool!.query<{
        product_id: number;
        fixed_fabric_id: number | null;
        use_fabric_image: boolean | null;
        title: string;
        description: string;
        total_units: number;
        reserved_units: number;
        regular_unit_price: number;
        lot_unit_price: number;
        status: string;
        only_members: boolean;
        image: string | null;
      }>(
        `select product_id, fixed_fabric_id, use_fabric_image, title, description, total_units, reserved_units, regular_unit_price, lot_unit_price, status, only_members, image
         from product_lots
         where id = $1
         limit 1`,
        [providedId],
      )
    : null;
  const existing = existingResult?.rows[0];
  const id = providedId || (await nextNumericId("product_lots"));
  const productId = toNumber(record.productId);

  if (productId <= 0) {
    throw new Error("El lote necesita un producto.");
  }

  const productResult = await postgresPool!.query<{ id: number; sku: string; name: string; public_price: number }>(
    "select id, sku, name, public_price from products where id = $1 and deleted_at is null limit 1",
    [productId],
  );
  const product = productResult.rows[0];

  if (!product) {
    throw new Error("El producto del lote no existe.");
  }

  const title = toStringValue(record.title) || `${product.name} - Lote`;
  const description = toStringValue(record.description) || existing?.description || "";
  const totalUnits = Math.max(1, toNumber(record.totalUnits) || existing?.total_units || 1);
  const reservedUnits =
    record.reservedUnits == null || record.reservedUnits === "" ? existing?.reserved_units ?? 0 : Math.max(0, toNumber(record.reservedUnits));
  const regularUnitPrice = Math.max(1, toNumber(record.regularUnitPrice) || existing?.regular_unit_price || product.public_price);
  const lotUnitPrice = Math.max(1, toNumber(record.lotUnitPrice) || existing?.lot_unit_price || regularUnitPrice);
  const status = toStringValue(record.status) || existing?.status || "draft";
  const onlyMembers =
    record.onlyMembers == null || record.onlyMembers === "" ? existing?.only_members ?? true : toBoolean(record.onlyMembers);
  const useFabricImage =
    record.useFabricImage == null || record.useFabricImage === "" ? existing?.use_fabric_image ?? false : toBoolean(record.useFabricImage);
  const rawFixedFabricId =
    record.fixedFabricId == null || record.fixedFabricId === "" ? existing?.fixed_fabric_id ?? null : toNumber(record.fixedFabricId);
  const fixedFabricId =
    typeof rawFixedFabricId === "number" && Number.isFinite(rawFixedFabricId) && rawFixedFabricId > 0 ? rawFixedFabricId : null;
  const fabricVariantRows = await postgresPool!.query<{ fabric_id: number; image: string }>(
    `select fabric_id, image
     from product_fabric_variants
     where product_id = $1
     order by sort_order, fabric_id`,
    [productId],
  );
  const fabricVariantMap = new Map(fabricVariantRows.rows.map((variant) => [variant.fabric_id, variant.image]));

  if (fabricVariantRows.rows.length > 0 && !fixedFabricId) {
    throw new Error("El lote necesita una tela fija para este producto.");
  }

  if (fixedFabricId != null && !fabricVariantMap.has(fixedFabricId)) {
    throw new Error("La tela fija elegida no pertenece a este producto.");
  }

  const fabricImage = fixedFabricId != null ? fabricVariantMap.get(fixedFabricId) ?? null : null;
  if (useFabricImage && !fabricImage) {
    throw new Error("La tela fija elegida no tiene imagen cargada.");
  }

  const image = useFabricImage ? null : toStringValue(record.image) || existing?.image || null;

  if (!useFabricImage && !image) {
    throw new Error("El lote necesita una imagen propia o usar la imagen de la tela.");
  }

  if (reservedUnits > totalUnits) {
    throw new Error("Las unidades reservadas no pueden superar el total del lote.");
  }

  await postgresPool!.query(
    `
      insert into product_lots (
        id, product_id, fixed_fabric_id, use_fabric_image, title, description, total_units, reserved_units, regular_unit_price, lot_unit_price,
        status, only_members, image
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      on conflict (id) do update set
        product_id = excluded.product_id,
        fixed_fabric_id = excluded.fixed_fabric_id,
        use_fabric_image = excluded.use_fabric_image,
        title = excluded.title,
        description = excluded.description,
        total_units = excluded.total_units,
        reserved_units = excluded.reserved_units,
        regular_unit_price = excluded.regular_unit_price,
        lot_unit_price = excluded.lot_unit_price,
        status = excluded.status,
        only_members = excluded.only_members,
        image = excluded.image,
        updated_at = now()
    `,
    [id, productId, fixedFabricId, useFabricImage, title, description, totalUnits, reservedUnits, regularUnitPrice, lotUnitPrice, status, onlyMembers, image],
  );
}

async function saveProductLotReservation(record: PayloadRecord) {
  const viewer = await requireAdminViewer();
  const id = toNumber(record.id);

  if (id <= 0) {
    throw new Error("La reserva necesita un ID válido.");
  }

  const existingResult = await postgresPool!.query<{
    lot_id: number;
    quantity: number;
    status: string;
  }>(
    `select lot_id, quantity, status
     from product_lot_reservations
     where id = $1
     limit 1`,
    [id],
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    throw new Error("La reserva no existe.");
  }

  const nextStatus = toStringValue(record.status) || existing.status || "reserved";
  const notes = toStringValue(record.notes) || null;
  const adminNote = toStringValue(record.adminNote || record.admin_note) || null;
  const cancelReason = toStringValue(record.cancelReason || record.cancel_reason) || null;
  const confirmedAt = nextStatus === "confirmed" ? new Date().toISOString() : null;
  const cancelledAt = nextStatus === "cancelled" ? new Date().toISOString() : null;
  const confirmedByUserId = nextStatus === "confirmed" ? viewer.userId : null;
  const cancelledByUserId = nextStatus === "cancelled" ? viewer.userId : null;

  await postgresPool!.query(
    `
      update product_lot_reservations
      set status = $2,
          notes = coalesce($3, notes),
          admin_note = coalesce($4, admin_note),
          cancel_reason = coalesce($5, cancel_reason),
          confirmed_at = coalesce($6::timestamptz, confirmed_at),
          cancelled_at = coalesce($7::timestamptz, cancelled_at),
          confirmed_by_user_id = coalesce($8, confirmed_by_user_id),
          cancelled_by_user_id = coalesce($9, cancelled_by_user_id),
          updated_at = now()
      where id = $1
    `,
    [id, nextStatus, notes, adminNote, cancelReason, confirmedAt, cancelledAt, confirmedByUserId, cancelledByUserId],
  );
}

async function saveProduct(record: PayloadRecord) {
  const providedId = record.id == null || record.id === "" ? 0 : toNumber(record.id);
  const existingResult = providedId
    ? await postgresPool!.query<{
        sku: string;
        presentation: string;
        category_id: number;
        category_name: string;
        category_ids: unknown;
        category_names: unknown;
        brand: string;
        status: string;
        image: string | null;
        images: unknown;
        fabric_ids: unknown;
        related_product_ids: unknown;
        only_members: boolean | null;
        featured_priority: number | null;
        trending: boolean | null;
        stock: number | null;
        views_count: number | null;
        sales_count: number | null;
        description: string | null;
        source_section: string | null;
        template_row_map: unknown;
      }>(
        `select sku, presentation, category_id, category_name, category_ids, category_names, brand, status, image, images, fabric_ids, related_product_ids, only_members,
                featured_priority, stock, views_count, sales_count, description, source_section, template_row_map
         from products
         where id = $1
         limit 1`,
        [providedId],
      )
    : null;
  const existing = existingResult?.rows[0];
  const existingFabricVariantRows = providedId
    ? await postgresPool!.query<{
        fabric_id: number;
        image: string;
        sort_order: number;
      }>(
        `select fabric_id, image, sort_order
         from product_fabric_variants
         where product_id = $1
         order by sort_order, fabric_id`,
        [providedId],
      )
    : null;
  const id = providedId || (await nextNumericId("products"));

  const selectedCategoryIds = parseNumberArray(record.categoryIds);
  const existingCategoryIds = parseNumberArray(existing?.category_ids);
  const existingCategoryNames = parseStringArray(existing?.category_names);
  const fallbackCategoryIds = existingCategoryIds.length > 0 ? existingCategoryIds : existing?.category_id ? [existing.category_id] : [];
  const categoryIds = selectedCategoryIds.length > 0 ? selectedCategoryIds : fallbackCategoryIds;

  if (categoryIds.length === 0) {
    throw new Error("El producto necesita al menos una categoria.");
  }

  const categoryResult = await postgresPool!.query<{ id: number; name: string }>(
    `select id, name from categories where id = any($1::int[]) and deleted_at is null order by id`,
    [categoryIds],
  );
  const categoryMap = new Map(categoryResult.rows.map((row) => [row.id, row.name]));
  const resolvedCategoryNames = categoryIds
    .map((categoryId) => categoryMap.get(categoryId))
    .filter((value): value is string => Boolean(value));
  const categoryNames = resolvedCategoryNames.length > 0 ? resolvedCategoryNames : existingCategoryNames.length > 0 ? existingCategoryNames : [existing?.category_name || ""];
  const primaryCategoryId = categoryIds[0];
  const primaryCategoryName = categoryNames[0] || existing?.category_name || "";
  const sku = toStringValue(record.sku) || existing?.sku || generateSku(id);
  const name = toStringValue(record.name);
  const detail = toStringValue(record.detail) || name || sku;
  const presentation = toStringValue(record.presentation) || existing?.presentation || "";
  const active =
    record.active == null || record.active === ""
      ? String(existing?.status ?? "").toLowerCase() !== "inactive"
      : toBoolean(record.active);
  const status = active ? "published" : "inactive";
  const brand = toStringValue(record.brand) || existing?.brand || "";
  const price = toNumber(record.price);
  if (price <= 0) {
    throw new Error("El producto necesita un precio válido.");
  }
  const images = parseStringArray(record.images);
  const image = images[0] || toStringValue(record.image) || existing?.image || null;
  const finalImages = images.length > 0 ? images : image ? [image] : [];
  const relatedProductIds = parseNumberArray(record.relatedProductIds).filter((productId) => productId !== id);
  const onlyMembers = toBoolean(record.onlyMembers);
  const existingFabricVariants = (existingFabricVariantRows?.rows ?? []).map((variant) => ({
    fabricId: variant.fabric_id,
    image: variant.image,
    order: variant.sort_order,
  }));
  const rawFabricVariants = parseFabricVariants(record.fabricVariants);
  const fabricVariantMap = new Map<number, FabricVariantDraft>();
  for (const variant of existingFabricVariants) {
    fabricVariantMap.set(variant.fabricId, variant);
  }
  for (const variant of rawFabricVariants) {
    const existingVariant = fabricVariantMap.get(variant.fabricId);
    fabricVariantMap.set(variant.fabricId, {
      fabricId: variant.fabricId,
      image: variant.image || existingVariant?.image || "",
      order: variant.order || existingVariant?.order || fabricVariantMap.size + 1,
      });
  }
  const finalFabricVariants = [...fabricVariantMap.values()].filter((variant) => Boolean(variant.image));
  const fabricIds = fabricVariantMap.size > 0 ? [...fabricVariantMap.keys()] : parseNumberArray(record.fabricIds);
  const featuredPriority =
    record.featuredPriority == null || record.featuredPriority === ""
      ? existing?.featured_priority ?? null
      : toNumber(record.featuredPriority);
  const stock = record.stock == null || record.stock === "" ? existing?.stock ?? null : toNumber(record.stock);
  const viewsCount =
    record.viewsCount == null || record.viewsCount === "" ? existing?.views_count ?? 0 : toNumber(record.viewsCount);
  const salesCount =
    record.salesCount == null || record.salesCount === "" ? existing?.sales_count ?? 0 : toNumber(record.salesCount);
  const description = toStringValue(record.description) || existing?.description || null;
  const sourceSection = toStringValue(record.sourceSection) || existing?.source_section || null;
  const existingTemplateRowMap = parseTemplateRowMap(existing?.template_row_map);
  const hasTemplateRowMap = Object.prototype.hasOwnProperty.call(record, "templateRowMap");
  const templateRowMap = hasTemplateRowMap ? parseTemplateRowMap(record.templateRowMap) : existingTemplateRowMap;
  const finalTemplateRowMap = hasTemplateRowMap ? templateRowMap : existingTemplateRowMap;
  adminLog("product:payload", {
    id,
    sku,
    fabricVariantsRaw: toStringValue(record.fabricVariants),
    rawFabricVariantsCount: rawFabricVariants.length,
    existingFabricVariantsCount: existingFabricVariants.length,
    finalFabricVariantsCount: finalFabricVariants.length,
    fabricIds,
  });

  const runTransaction = async (client: PoolClient) => {
    await client.query("begin");

    try {
      await client.query(
        `
          insert into products (
            id, sku, name, detail, presentation, category_id, category_name, category_ids, category_names, brand,
            vegano, kosher, testeado_en_animales, public_price, member_price, image, images, fabric_ids, related_product_ids, only_members,
            status, featured, featured_priority, stock, views_count, sales_count, description, source_section, template_row_map
          ) values (
            $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20,
            $21,$22,$23,$24,$25,$26,$27,$28,$29::jsonb
          )
          on conflict (id) do update set
            sku = excluded.sku,
            name = excluded.name,
            detail = excluded.detail,
            presentation = excluded.presentation,
            category_id = excluded.category_id,
            category_name = excluded.category_name,
            category_ids = excluded.category_ids,
            category_names = excluded.category_names,
            brand = excluded.brand,
            vegano = excluded.vegano,
            kosher = excluded.kosher,
            testeado_en_animales = excluded.testeado_en_animales,
            public_price = excluded.public_price,
            member_price = excluded.member_price,
            image = excluded.image,
            images = excluded.images,
            fabric_ids = excluded.fabric_ids,
            related_product_ids = excluded.related_product_ids,
            only_members = excluded.only_members,
            status = excluded.status,
            featured = excluded.featured,
            featured_priority = excluded.featured_priority,
            stock = excluded.stock,
            views_count = excluded.views_count,
            sales_count = excluded.sales_count,
            description = excluded.description,
            source_section = excluded.source_section,
            template_row_map = excluded.template_row_map,
            updated_at = now()
        `,
        [
          id,
          sku,
          name,
          detail,
          presentation,
          primaryCategoryId,
          primaryCategoryName,
          JSON.stringify(categoryIds),
          JSON.stringify(categoryNames),
          brand,
          toBoolean(record.vegano),
          toBoolean(record.kosher),
          record.testeadoEnAnimales == null ? null : toBoolean(record.testeadoEnAnimales),
          price,
          price,
          image,
          JSON.stringify(finalImages),
          JSON.stringify(fabricIds),
          JSON.stringify(relatedProductIds),
          onlyMembers,
          status,
          toBoolean(record.featured),
          featuredPriority,
          stock,
          viewsCount,
          salesCount,
          description,
          sourceSection,
          JSON.stringify(finalTemplateRowMap),
        ],
      );

      await client.query("delete from product_fabric_variants where product_id = $1", [id]);
      for (const [index, variant] of finalFabricVariants.entries()) {
        if (!variant.image) {
          continue;
        }

        await client.query(
          `
            insert into product_fabric_variants (product_id, fabric_id, image, sort_order)
            values ($1, $2, $3, $4)
          `,
          [id, variant.fabricId, variant.image, variant.order || index + 1],
        );
      }

      await client.query("commit");
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        // Si la conexión ya murió, dejamos que el error original suba.
      }

      throw error;
    }
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const client = await postgresPool!.connect();

    try {
      await runTransaction(client);
      return;
    } catch (error) {
      if (!isTransientConnectionError(error) || attempt === 1) {
        throw error;
      }

      await postgresPool!.end().catch(() => undefined);
      continue;
    } finally {
      client.release();
    }
  }
}

async function saveSearchScope(record: PayloadRecord) {
  const id = await resolveTextId("header_search_scopes", toStringValue(record.id), [toStringValue(record.label), toStringValue(record.href)]);
  await postgresPool!.query(
    `
      insert into header_search_scopes (id, label, href, sort_order)
      values ($1, $2, $3, $4)
      on conflict (id) do update set
        label = excluded.label,
        href = excluded.href,
        sort_order = excluded.sort_order
    `,
    [id, toStringValue(record.label), toStringValue(record.href), toNumber(record.sort_order)],
  );
}

async function saveHeaderSection(record: PayloadRecord) {
  const id = await resolveTextId("header_sections", toStringValue(record.id), [toStringValue(record.label), toStringValue(record.href)]);
  await postgresPool!.query(
    `
      insert into header_sections (id, label, icon, href, sort_order)
      values ($1, $2, $3, $4, $5)
      on conflict (id) do update set
        label = excluded.label,
        icon = excluded.icon,
        href = excluded.href,
        sort_order = excluded.sort_order
    `,
    [id, toStringValue(record.label), toStringValue(record.icon), toStringValue(record.href), toNumber(record.sort_order)],
  );
}

async function saveHeaderGroup(record: PayloadRecord) {
  const id = await resolveTextId("header_groups", toStringValue(record.id), [toStringValue(record.section_id), toStringValue(record.label)]);
  await postgresPool!.query(
    `
      insert into header_groups (id, section_id, label, href, sort_order)
      values ($1, $2, $3, $4, $5)
      on conflict (id) do update set
        section_id = excluded.section_id,
        label = excluded.label,
        href = excluded.href,
        sort_order = excluded.sort_order
    `,
    [
      id,
      toStringValue(record.section_id),
      toStringValue(record.label),
      toStringValue(record.href),
      toNumber(record.sort_order),
    ],
  );
}

async function saveHeaderGroupItem(record: PayloadRecord) {
  const id = await resolveTextId("header_group_items", toStringValue(record.id), [toStringValue(record.group_id), toStringValue(record.label)]);
  await postgresPool!.query(
    `
      insert into header_group_items (id, group_id, label, href, sort_order)
      values ($1, $2, $3, $4, $5)
      on conflict (id) do update set
        group_id = excluded.group_id,
        label = excluded.label,
        href = excluded.href,
        sort_order = excluded.sort_order
    `,
    [id, toStringValue(record.group_id), toStringValue(record.label), toStringValue(record.href), toNumber(record.sort_order)],
  );
}

async function saveMeta(record: PayloadRecord) {
  await postgresPool!.query(
    `
      insert into site_content_meta (
        id, session_role, view_mode, active_admin_panel, panel_search_query,
        active_modal_action, ping, next_ids
      ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
      on conflict (id) do update set
        session_role = excluded.session_role,
        view_mode = excluded.view_mode,
        active_admin_panel = excluded.active_admin_panel,
        panel_search_query = excluded.panel_search_query,
        active_modal_action = excluded.active_modal_action,
        ping = excluded.ping,
        next_ids = excluded.next_ids
    `,
    [
      1,
      toStringValue(record.session_role) || null,
      toStringValue(record.view_mode) || null,
      toStringValue(record.active_admin_panel) || null,
      toStringValue(record.panel_search_query) || null,
      toStringValue(record.active_modal_action) || null,
      toBoolean(record.ping),
      toStringValue(record.next_ids) || "{}",
    ],
  );
}

async function saveRow(table: AdminTableKey, record: PayloadRecord, formData: FormData) {
  switch (table) {
    case "products":
      return saveProduct(record);
    case "product_lots":
      return saveProductLot(record);
    case "product_lot_reservations":
      return saveProductLotReservation(record);
    case "brands":
      return saveBrand(record);
    case "fabrics":
      return saveFabric(record);
    case "categories":
      return saveCategory(record);
    case "users":
      return saveUser(record);
    case "hero_slides":
      return saveHeroSlide(record);
    case "banners":
      return saveBanner(record);
    case "packs":
      return savePack(record, formData);
    case "header_search_scopes":
      return saveSearchScope(record);
    case "header_sections":
      return saveHeaderSection(record);
    case "header_groups":
      return saveHeaderGroup(record);
    case "header_group_items":
      return saveHeaderGroupItem(record);
    case "site_content_meta":
      return saveMeta(record);
    default:
      throw new Error(`Tabla no soportada: ${table satisfies never}`);
  }
}

async function deleteRow(table: AdminTableKey, id: string) {
  switch (table) {
    case "products":
      await postgresPool!.query("delete from products where id = $1", [toNumber(id)]);
      return;
    case "product_lots":
      await postgresPool!.query("delete from product_lots where id = $1", [toNumber(id)]);
      return;
    case "product_lot_reservations":
      await postgresPool!.query("delete from product_lot_reservations where id = $1", [toNumber(id)]);
      return;
    case "brands":
      await postgresPool!.query("delete from brands where id = $1", [toStringValue(id)]);
      return;
    case "fabrics":
      await postgresPool!.query("delete from fabrics where id = $1", [toNumber(id)]);
      return;
    case "categories":
      await postgresPool!.query("delete from categories where id = $1", [toNumber(id)]);
      return;
    case "users":
      {
        const userResult = await postgresPool!.query<{ auth_user_id: string | null }>(
          "select auth_user_id from users where id = $1 limit 1",
          [toNumber(id)],
        );
        const authUserId = userResult.rows[0]?.auth_user_id;

        if (authUserId) {
          const supabase = createSupabaseServiceClient();
          const { error } = await supabase.auth.admin.deleteUser(authUserId);

          if (error) {
            throw new Error(error.message || "No se pudo borrar el usuario de acceso.");
          }
        }

        await postgresPool!.query("delete from users where id = $1", [toNumber(id)]);
      }
      return;
    case "hero_slides":
      await postgresPool!.query("delete from hero_slides where id = $1", [toNumber(id)]);
      return;
    case "banners":
      await postgresPool!.query("delete from banners where id = $1", [toNumber(id)]);
      return;
    case "packs":
      await postgresPool!.query("delete from promotion_packs where id = $1", [toNumber(id)]);
      return;
    case "header_search_scopes":
      await postgresPool!.query("delete from header_search_scopes where id = $1", [toStringValue(id)]);
      return;
    case "header_sections":
      await postgresPool!.query("delete from header_sections where id = $1", [toStringValue(id)]);
      return;
    case "header_groups":
      await postgresPool!.query("delete from header_groups where id = $1", [toStringValue(id)]);
      return;
    case "header_group_items":
      await postgresPool!.query("delete from header_group_items where id = $1", [toStringValue(id)]);
      return;
    case "site_content_meta":
      await postgresPool!.query("delete from site_content_meta where id = 1");
      return;
    default:
      throw new Error(`Tabla no soportada: ${table satisfies never}`);
  }
}

function getIdsPayload(formData: FormData) {
  const raw = formData.get("ids_json");

  if (typeof raw !== "string" || !raw.trim()) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => String(item)).filter(Boolean);
  } catch {
    return [];
  }
}

function refreshAdminViews() {
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/busqueda");
  revalidatePath("/carrito");
  revalidatePath("/producto/[sku]", "page");
}

export async function saveAdminRecord(formData: FormData) {
  await requireAdminViewer();
  await ensureDatabase();

  const table = String(formData.get("table") || "") as AdminTableKey;
  const payload = getJsonPayload(formData);

  if (!table) {
    throw new Error("Falta la tabla.");
  }

  await saveRow(table, payload, formData);
  refreshAdminViews();
}

export async function deleteAdminRecord(formData: FormData) {
  await requireAdminViewer();
  await ensureDatabase();

  const table = String(formData.get("table") || "") as AdminTableKey;
  const id = String(formData.get("id") || "");

  if (!table || !id) {
    throw new Error("Falta la tabla o el id.");
  }

  await deleteRow(table, id);
  refreshAdminViews();
}

export async function deleteAdminRecords(formData: FormData) {
  await requireAdminViewer();
  await ensureDatabase();

  const table = String(formData.get("table") || "") as AdminTableKey;
  const ids = getIdsPayload(formData);

  if (!table || ids.length === 0) {
    throw new Error("Falta la tabla o los ids.");
  }

  for (const id of ids) {
    await deleteRow(table, id);
  }

  refreshAdminViews();
}
