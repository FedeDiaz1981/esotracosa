import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/infrastructure/auth/pintofruta-auth";
import { ensureSiteContentSchema } from "@/infrastructure/db/ensure-site-content-schema";
import { postgresPool } from "@/infrastructure/db/postgres";
import { notifyLotCompleted } from "@/lib/lot-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: Request) {
  if (!postgresPool) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL no está configurada." }, { status: 500 });
  }

  const viewer = await getCurrentViewer();
  if (!viewer?.authenticated) {
    return NextResponse.json({ ok: false, error: "Tenés que iniciar sesión para reservar." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { lotId?: number; quantity?: number };
  const lotId = toNumber(body.lotId);
  const quantity = Math.max(1, toNumber(body.quantity));

  if (!lotId || !quantity) {
    return NextResponse.json({ ok: false, error: "Falta el lote o la cantidad." }, { status: 400 });
  }

  await ensureSiteContentSchema();

  const client = await postgresPool.connect();

  try {
    await client.query("begin");

    const lotResult = await client.query<{
      id: number;
      product_id: number;
      title: string;
      description: string;
      total_units: number;
      reserved_units: number;
      regular_unit_price: number;
      lot_unit_price: number;
      status: string;
      only_members: boolean;
      image: string | null;
      fixed_fabric_id: number | null;
      fixed_fabric_name: string | null;
      resolved_image: string | null;
      sku: string;
      name: string;
      brand: string;
      presentation: string;
    }>(
      `
        select
          pl.id,
          pl.product_id,
          pl.title,
          pl.description,
          pl.total_units,
          pl.reserved_units,
          pl.regular_unit_price,
          pl.lot_unit_price,
          pl.status,
          pl.only_members,
          pl.image,
          pl.fixed_fabric_id,
          f.name as fixed_fabric_name,
          case when pl.use_fabric_image then pfv.image else pl.image end as resolved_image,
          p.sku,
          p.name,
          p.brand,
          p.presentation
        from product_lots pl
        inner join products p on p.id = pl.product_id
        left join fabrics f on f.id = pl.fixed_fabric_id
        left join product_fabric_variants pfv on pfv.product_id = pl.product_id and pfv.fabric_id = pl.fixed_fabric_id
        where pl.id = $1
          and pl.deleted_at is null
          and p.deleted_at is null
        for update of pl
        limit 1
      `,
      [lotId],
    );

    const lot = lotResult.rows[0];
    if (!lot) {
      throw new Error("El lote no existe.");
    }

    const status = String(lot.status).toLowerCase();
    if (!["open", "published", "active", "reservable"].includes(status)) {
      throw new Error("El lote no está disponible para reserva.");
    }

    const availableUnits = Math.max(0, Number(lot.total_units) - Number(lot.reserved_units));
    if (availableUnits <= 0) {
      throw new Error("El lote ya está completo.");
    }

    if (quantity > availableUnits) {
      throw new Error(`Solo quedan ${availableUnits} unidades disponibles.`);
    }

    const unitPrice = Math.max(1, Number(lot.lot_unit_price) || 0);
    const totalPrice = unitPrice * quantity;

    const userResult = await client.query<{ id: number }>(
      "select id from users where auth_user_id = $1 limit 1",
      [viewer.authUserId],
    );
    const userId = userResult.rows[0]?.id;

    if (!userId) {
      throw new Error("No pudimos vincular tu usuario a la reserva.");
    }

    await client.query("lock table product_lot_reservations in exclusive mode");
    const nextReservationIdResult = await client.query<{ next_id: number }>(
      "select coalesce(max(id), 0) + 1 as next_id from product_lot_reservations",
    );
    const reservationId = Number(nextReservationIdResult.rows[0]?.next_id) || 1;

    const reservationResult = await client.query<{ id: number }>(
      `
        insert into product_lot_reservations (
          id, lot_id, user_id, quantity, unit_price, total_price, status,
          lot_title_snapshot, product_sku_snapshot, product_name_snapshot, fabric_name_snapshot, lot_image_snapshot
        ) values ($1, $2, $3, $4, $5, $6, 'reserved', $7, $8, $9, $10, $11)
        returning id
      `,
      [
        reservationId,
        lotId,
        userId,
        quantity,
        unitPrice,
        totalPrice,
        lot.title,
        lot.sku,
        lot.name,
        lot.fixed_fabric_name,
        lot.resolved_image ?? lot.image,
      ],
    );

    const reservedUnits = Number(lot.reserved_units) + quantity;
    const nextStatus = reservedUnits >= Number(lot.total_units) ? "sold_out" : lot.status;
    const lotCompleted = reservedUnits >= Number(lot.total_units);

    await client.query(
      `
        update product_lots
        set reserved_units = $2,
            status = $3,
            completed_at = case when $4 then coalesce(completed_at, now()) else completed_at end,
            updated_at = now()
        where id = $1
      `,
      [lotId, reservedUnits, nextStatus, lotCompleted],
    );

    await client.query("commit");

    if (lotCompleted) {
      try {
        const notification = await notifyLotCompleted({
          lotId: lot.id,
          lotTitle: lot.title,
          productSku: lot.sku,
          productName: lot.name,
          totalUnits: Number(lot.total_units),
          reservedUnits,
          lotUnitPrice: unitPrice,
          regularUnitPrice: Number(lot.regular_unit_price) || unitPrice,
          fixedFabricName: lot.fixed_fabric_name,
        });

        if (notification.sent) {
          await postgresPool.query(
            `
              update product_lots
              set completion_email_sent_at = coalesce(completion_email_sent_at, now()),
                  admin_notified_at = coalesce(admin_notified_at, now()),
                  updated_at = now()
              where id = $1
            `,
            [lotId],
          );
        }
      } catch (notificationError) {
        console.error("[lot-notification] failed", notificationError);
      }
    }

    return NextResponse.json({
      ok: true,
      reservation: {
        id: reservationResult.rows[0]?.id,
      },
      lot: {
        availableUnits: Math.max(0, availableUnits - quantity),
        reservedUnits,
        status: nextStatus,
        completed: lotCompleted,
      },
    });
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Si la conexión murió, dejamos que el error original suba.
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo reservar el lote.",
      },
      { status: 400 },
    );
  } finally {
    client.release();
  }
}
