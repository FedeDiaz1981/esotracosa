import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();

    if (!key || process.env[key]) {
      continue;
    }

    const value = rawValue.replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
    process.env[key] = value;
  }
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return "";
  }

  return String(process.argv[index + 1] ?? "").trim();
}

function generatePassword() {
  const segment = (length) => crypto.randomBytes(length).toString("base64url").slice(0, length);
  return `Pf${segment(8)}!${segment(8)}#${segment(6)}`;
}

function requireEnv(name) {
  const value = String(process.env[name] ?? "").trim();

  if (!value) {
    throw new Error(`Falta configurar ${name}.`);
  }

  return value;
}

loadDotEnvFile(path.join(projectRoot, ".env.local"));
loadDotEnvFile(path.join(projectRoot, ".env"));

const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const databaseUrl = requireEnv("DATABASE_URL");

const adminEmail = getArg("--email") || String(process.env.ADMIN_EMAIL ?? "admin@admin.com").trim();
const adminName = getArg("--name") || String(process.env.ADMIN_NAME ?? "Admin").trim();
const adminPassword = getArg("--password") || String(process.env.ADMIN_PASSWORD ?? "1q2w3e4r5t6y").trim() || generatePassword();

if (!adminEmail) {
  throw new Error("Falta indicar el correo del administrador.");
}

const pool = new Pool({ connectionString: databaseUrl });
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

async function ensureAuthUser() {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  const existingAuthUser = listData.users.find((user) => String(user.email ?? "").toLowerCase() === adminEmail.toLowerCase());

  if (existingAuthUser) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (updateError) {
      throw updateError;
    }

    return existingAuthUser.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      name: adminName,
      role: "Administrador",
    },
  });

  if (error || !data.user) {
    throw error ?? new Error("No se pudo crear el usuario administrador.");
  }

  return data.user.id;
}

async function ensureAdminRow(authUserId) {
  const existingUser = await pool.query("select id from users where lower(email) = lower($1) limit 1", [adminEmail]);

  if (existingUser.rows[0]) {
    await pool.query(
      `update users
       set auth_user_id = $1,
           name = $2,
           email = $3,
           role = 'Administrador',
           can_see_prices = true,
           active = true
       where id = $4`,
      [authUserId, adminName, adminEmail, existingUser.rows[0].id],
    );
    return existingUser.rows[0].id;
  }

  const nextIdResult = await pool.query("select coalesce(max(id), 0) + 1 as next_id from users");
  const nextId = nextIdResult.rows[0]?.next_id ?? 1;

  await pool.query(
    `insert into users (id, auth_user_id, name, email, role, can_see_prices, active)
     values ($1, $2, $3, $4, 'Administrador', true, true)`,
    [nextId, authUserId, adminName, adminEmail],
  );

  return nextId;
}

async function main() {
  try {
    const authUserId = await ensureAuthUser();
    const userId = await ensureAdminRow(authUserId);

    console.log("Administrador listo.");
    console.log(`Usuario: ${adminEmail}`);
    console.log(`Nombre: ${adminName}`);
    console.log(`ID local: ${userId}`);
    console.log(`ID auth: ${authUserId}`);
    console.log(`Contraseña: ${adminPassword}`);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("No se pudo inicializar el administrador.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
