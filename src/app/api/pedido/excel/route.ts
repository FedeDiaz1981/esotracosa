import { appendFileSync } from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { OrderExcelRequestItem } from "@/lib/order-excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function trace(step: string, details: Record<string, unknown> = {}) {
  try {
    appendFileSync(
      "pedido-excel-trace.log",
      `${new Date().toISOString()} ${step} ${JSON.stringify(details)}\n`,
      "utf8",
    );
  } catch {
    // Ignorado a propósito para no romper la exportación si el log no se puede escribir.
  }
}

type ViewerSnapshot = {
  authenticated: boolean;
  role: "Administrador" | "Cliente";
  canSeePrices: boolean;
  name: string | null;
  email: string | null;
};

type SessionPayload = {
  authUserId: string;
  email: string;
  name: string;
  role: "Administrador" | "Cliente" | "admin" | "Cliente" | string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function normalizeRole(role: string | null | undefined): "Administrador" | "Cliente" {
  const normalized = String(role ?? "").trim().toLowerCase();
  return normalized === "admin" || normalized === "administrador" ? "Administrador" : "Cliente";
}

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
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
    const secret = getSessionSecret();
    if (!secret) {
      return null;
    }

    const expectedSignature = createHmac("sha256", secret).update(serializedPayload).digest("base64url");
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

function readViewerSnapshot(request: Request): ViewerSnapshot {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("pintofruta_session="));

  const rawCookie = sessionCookie ? decodeURIComponent(sessionCookie.slice("pintofruta_session=".length)) : null;
  const payload = decodeSessionCookieValue(rawCookie);

  if (!payload || payload.expiresAt <= Date.now()) {
    return {
      authenticated: false,
      role: "Cliente",
      canSeePrices: false,
      name: null,
      email: null,
    };
  }

  return {
    authenticated: true,
    role: normalizeRole(payload.role),
    canSeePrices: true,
    name: payload.name,
    email: payload.email,
  };
}

export async function POST(request: Request) {
  return handleExcelExport(request);
}

export async function GET(request: Request) {
  return handleExcelExport(request);
}

async function handleExcelExport(request: Request) {
  console.info("[pedido/excel] request:entered");
  trace("request:entered");
  trace("import:order-excel:start");
  const { buildOrderExcelFile } = await import("@/lib/order-excel");
  trace("import:order-excel:done");

  const payload = new URL(request.url).searchParams.get("payload");
  trace("request:payload", { hasPayload: Boolean(payload), length: payload?.length ?? 0 });

  if (!payload) {
    trace("request:missing-payload");
    return NextResponse.json({ error: "Falta el pedido codificado en la URL." }, { status: 400 });
  }

  let body: { items?: OrderExcelRequestItem[] };
  try {
    body = JSON.parse(payload) as { items?: OrderExcelRequestItem[] };
    trace("request:parse:done");
  } catch (error) {
    trace("request:parse:error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "El pedido debe enviarse en formato JSON valido." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  console.info("[pedido/excel] request:start", {
    items: items.length,
    firstItem: items[0]
      ? {
          kind: items[0].kind,
          sku: items[0].sku,
          id: items[0].id,
          quantity: items[0].quantity,
        }
      : null,
  });
  trace("request:start", {
    items: items.length,
    firstItem: items[0]
      ? {
          kind: items[0].kind,
          sku: items[0].sku,
          id: items[0].id,
          quantity: items[0].quantity,
        }
      : null,
  });

  if (items.length === 0) {
    trace("request:empty");
    return NextResponse.json({ error: "El pedido esta vacio." }, { status: 400 });
  }

  trace("viewer:start");
  const viewer = readViewerSnapshot(request);
  trace("viewer:done", {
    authenticated: Boolean(viewer?.authenticated),
    canSeePrices: Boolean(viewer?.authenticated && viewer.canSeePrices),
    role: viewer?.role ?? null,
  });
  console.info("[pedido/excel] viewer", {
    authenticated: Boolean(viewer?.authenticated),
    canSeePrices: Boolean(viewer?.authenticated && viewer.canSeePrices),
    role: viewer?.role ?? null,
  });

  trace("build:start");
  const exportResult = await buildOrderExcelFile({
    items,
    viewer: {
      authenticated: Boolean(viewer?.authenticated),
      canSeePrices: Boolean(viewer?.authenticated && viewer.canSeePrices),
      name: viewer?.name ?? null,
      email: viewer?.email ?? null,
    },
  });

  console.info("[pedido/excel] response:ready", {
    fileName: exportResult.fileName,
    usedTemplate: exportResult.usedTemplate,
    lines: exportResult.lines.length,
    bufferSize: exportResult.buffer.length,
  });
  trace("response:ready", {
    fileName: exportResult.fileName,
    usedTemplate: exportResult.usedTemplate,
    lines: exportResult.lines.length,
    bufferSize: exportResult.buffer.length,
  });

  return new NextResponse(exportResult.buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportResult.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
