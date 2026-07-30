import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { postgresPool } from "@/infrastructure/db/postgres";
import type { AuthRole, ViewerSession } from "@/domain/viewer";

const SESSION_COOKIE_NAME = "pintofruta_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  authUserId: string;
  email: string;
  name: string;
  role: AuthRole;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

type StoredUserRow = {
  id: number;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: string;
  can_see_prices: boolean;
  active: boolean;
};

export type SignInResult =
  | {
      ok: true;
      viewer: ViewerSession;
    }
  | {
      ok: false;
      error: string;
    };

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_URL no está configurada.");
  }

  return url;
}

function getSupabaseAnonKey() {
  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("SUPABASE_ANON_KEY no está configurada.");
  }

  return key;
}

function normalizeRole(role: string | null | undefined): AuthRole {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "admin" || normalized === "administrador") {
    return "Administrador";
  }

  return "Cliente";
}

function serializePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signPayload(serializedPayload: string) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("Falta configurar AUTH_SESSION_SECRET o SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createHmac("sha256", secret).update(serializedPayload).digest("base64url");
}

function createSessionCookieValue(payload: SessionPayload) {
  const serializedPayload = serializePayload(payload);
  const signature = signPayload(serializedPayload);
  return `${serializedPayload}.${signature}`;
}

function decodeSessionCookieValue(cookieValue: string | null | undefined): SessionPayload | null {
  if (!cookieValue) {
    return null;
  }

  const [serializedPayload, signature] = cookieValue.split(".");
  if (!serializedPayload || !signature) {
    return null;
  }

  try {
    const expectedSignature = signPayload(serializedPayload);
    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(serializedPayload, "base64url").toString("utf8")) as SessionPayload;

    if (
      !payload ||
      typeof payload.authUserId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.nonce !== "string"
    ) {
      return null;
    }

    return {
      authUserId: payload.authUserId,
      email: payload.email,
      name: payload.name,
      role: normalizeRole(payload.role),
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      nonce: payload.nonce,
    };
  } catch {
    return null;
  }
}

function toViewerSession(row: StoredUserRow, authUserId: string): ViewerSession {
  const role = normalizeRole(row.role);

  return {
    authenticated: true,
    userId: row.id,
    authUserId,
    email: row.email,
    name: row.name,
    role,
    canSeePrices: row.can_see_prices || role === "Administrador",
    active: row.active,
    isAdmin: role === "Administrador",
  };
}

async function findStoredUserByEmailOrAuthUserId(authUserId: string, email: string) {
  if (!postgresPool) {
    return null;
  }

  const exactAuthResult = await postgresPool.query<StoredUserRow>(
    `select id, auth_user_id, name, email, role, can_see_prices, active
     from users
     where auth_user_id = $1
     limit 1`,
    [authUserId],
  );

  const authRow = exactAuthResult.rows[0];
  if (authRow) {
    return authRow;
  }

  const emailResult = await postgresPool.query<StoredUserRow>(
    `select id, auth_user_id, name, email, role, can_see_prices, active
     from users
     where lower(email) = lower($1)
     limit 1`,
    [email],
  );

  return emailResult.rows[0] ?? null;
}

async function bindAuthUserId(rowId: number, authUserId: string) {
  if (!postgresPool) {
    return;
  }

  await postgresPool
    .query(
      `update users
       set auth_user_id = $1
       where id = $2 and auth_user_id is null`,
      [authUserId, rowId],
    )
    .catch(() => undefined);
}

function buildSessionPayload(row: StoredUserRow, authUserId: string): SessionPayload {
  const now = Date.now();
  return {
    authUserId,
    email: row.email,
    name: row.name,
    role: normalizeRole(row.role),
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
    nonce: randomUUID(),
  };
}

function isExpired(payload: SessionPayload) {
  return payload.expiresAt <= Date.now();
}

export async function createSupabaseAuthClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada.");
  }

  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function signInWithCredentials(email: string, password: string): Promise<SignInResult> {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");

  if (!normalizedEmail || !normalizedPassword) {
    return { ok: false, error: "Completá correo y contraseña." };
  }

  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error || !data.user) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  const authUserId = data.user.id;
  const storedUser = await findStoredUserByEmailOrAuthUserId(authUserId, normalizedEmail);

  if (!storedUser) {
    return { ok: false, error: "Tu cuenta no tiene perfil habilitado en PintoFruta." };
  }

  if (!storedUser.active) {
    return { ok: false, error: "Tu cuenta está inactiva. Contactá a administración." };
  }

  if (!storedUser.auth_user_id) {
    await bindAuthUserId(storedUser.id, authUserId);
  }

  const viewer = toViewerSession(storedUser, authUserId);
  const sessionPayload = buildSessionPayload(storedUser, authUserId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionCookieValue(sessionPayload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return { ok: true, viewer };
}

export async function signOutViewerSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentViewerFromCookie(): Promise<ViewerSession | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const payload = decodeSessionCookieValue(rawCookie);

  if (!payload || isExpired(payload)) {
    return null;
  }

  const role = normalizeRole(payload.role);

  return {
    authenticated: true,
    userId: 0,
    authUserId: payload.authUserId,
    email: payload.email,
    name: payload.name,
    role,
    canSeePrices: true,
    active: true,
    isAdmin: role === "Administrador",
  };
}

export const getCurrentViewer = cache(async (): Promise<ViewerSession | null> => {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const payload = decodeSessionCookieValue(rawCookie);

  if (!payload || isExpired(payload)) {
    return null;
  }

  const storedUser = await findStoredUserByEmailOrAuthUserId(payload.authUserId, payload.email);

  if (!storedUser || !storedUser.active) {
    return null;
  }

  return toViewerSession(storedUser, payload.authUserId);
});

export async function requireAdminViewer() {
  const viewer = await getCurrentViewer();

  if (!viewer?.authenticated || !viewer.isAdmin) {
    throw new Error("No autorizado.");
  }

  return viewer;
}
