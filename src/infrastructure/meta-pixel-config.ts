import { postgresPool } from "@/infrastructure/db/postgres";

const SETTING_KEY = "meta_pixel_id";

async function ensureSettingsTable() {
  await postgresPool!.query(`
    create table if not exists admin_settings (
      key text primary key,
      value text not null,
      updated_at timestamptz not null default now()
    )
  `);
}

function getEnvironmentPixelId() {
  return process.env.META_PIXEL_ID?.trim() || process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
}

function normalizePixelId(pixelId: string) {
  const normalized = pixelId.trim();
  if (!/^\d{5,20}$/.test(normalized)) throw new Error("El ID del píxel de Meta debe contener solo números.");
  return normalized;
}

export async function getMetaPixelId() {
  const environmentPixelId = getEnvironmentPixelId();
  if (!postgresPool) return environmentPixelId;

  await ensureSettingsTable();
  const result = await postgresPool.query<{ value: string }>("select value from admin_settings where key = $1", [SETTING_KEY]);
  const configuredPixelId = result.rows[0]?.value.trim() || "";
  return configuredPixelId || environmentPixelId;
}

export async function getMetaPixelConfigurationStatus() {
  const environmentPixelId = getEnvironmentPixelId();
  if (!postgresPool) return { configured: Boolean(environmentPixelId), source: "environment" as const };

  await ensureSettingsTable();
  const result = await postgresPool.query<{ value: string }>("select value from admin_settings where key = $1", [SETTING_KEY]);
  const configuredInAdmin = Boolean(result.rows[0]?.value.trim());
  return { configured: configuredInAdmin || Boolean(environmentPixelId), source: configuredInAdmin ? "admin" as const : "environment" as const };
}

export async function saveMetaPixelId(pixelId: string) {
  if (!postgresPool) throw new Error("La base de datos no está disponible.");
  const normalized = normalizePixelId(pixelId);
  await ensureSettingsTable();
  await postgresPool.query(
    `insert into admin_settings (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [SETTING_KEY, normalized],
  );
}
