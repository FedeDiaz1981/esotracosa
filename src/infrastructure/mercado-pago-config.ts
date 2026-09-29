import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { postgresPool } from "@/infrastructure/db/postgres";

const SETTING_KEY = "mercado_pago_access_token";

function getEncryptionKey() {
  const secret = process.env.MERCADO_PAGO_CONFIG_ENCRYPTION_KEY?.trim() || process.env.AUTH_SESSION_SECRET?.trim();
  if (!secret) throw new Error("Falta AUTH_SESSION_SECRET para cifrar la configuración de Mercado Pago.");
  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

function decrypt(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) return "";
  try {
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

async function ensureSettingsTable() {
  await postgresPool!.query(`
    create table if not exists admin_settings (
      key text primary key,
      value text not null,
      updated_at timestamptz not null default now()
    )
  `);
}

export async function getMercadoPagoAccessToken() {
  const environmentToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!postgresPool) return environmentToken || "";

  await ensureSettingsTable();
  const result = await postgresPool.query<{ value: string }>("select value from admin_settings where key = $1", [SETTING_KEY]);
  const configuredToken = result.rows[0] ? decrypt(result.rows[0].value) : "";
  return configuredToken || environmentToken || "";
}

export async function getMercadoPagoConfigurationStatus() {
  if (!postgresPool) return { configured: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()), source: "environment" as const };
  await ensureSettingsTable();
  const result = await postgresPool.query<{ value: string }>("select value from admin_settings where key = $1", [SETTING_KEY]);
  const configuredInAdmin = Boolean(result.rows[0] && decrypt(result.rows[0].value));
  return { configured: configuredInAdmin || Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim()), source: configuredInAdmin ? "admin" as const : "environment" as const };
}

export async function saveMercadoPagoAccessToken(accessToken: string) {
  if (!postgresPool) throw new Error("La base de datos no está disponible.");
  const normalized = accessToken.trim();
  if (!/^((APP_USR|TEST)-)[A-Za-z0-9_-]{16,}$/.test(normalized)) throw new Error("El Access Token de Mercado Pago no tiene un formato válido.");
  await ensureSettingsTable();
  await postgresPool.query(
    `insert into admin_settings (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [SETTING_KEY, encrypt(normalized)],
  );
}
