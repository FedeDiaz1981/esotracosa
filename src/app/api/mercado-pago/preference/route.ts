import { NextRequest, NextResponse } from "next/server";
import { getSiteContent } from "@/infrastructure/site-content.repository";
import { resolveProductUnitPrice } from "@/lib/pricing";
import { getMercadoPagoAccessToken } from "@/infrastructure/mercado-pago-config";

type CheckoutItemInput = {
  kind?: "product" | "pack" | "lot";
  id?: number;
  quantity?: number;
  measureId?: string;
  lotId?: number;
  reservationId?: number;
};

type CheckoutRequest = {
  items?: CheckoutItemInput[];
  payer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

type MercadoPagoItem = {
  id: string;
  title: string;
  description?: string;
  currency_id: "ARS";
  quantity: number;
  unit_price: number;
};

function getAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return "";
  }

  const configured = (process.env.MERCADO_PAGO_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.includes(origin) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
    return origin;
  }

  return "";
}

function jsonResponse(request: NextRequest, body: unknown, status = 200) {
  const origin = getAllowedOrigin(request);
  const response = NextResponse.json(body, { status });

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  return response;
}

function normalizeQuantity(value: unknown) {
  const quantity = Math.floor(Number(value));
  return Number.isFinite(quantity) ? Math.min(99, Math.max(1, quantity)) : 1;
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function getReturnUrls() {
  const returnUrl = process.env.MERCADO_PAGO_RETURN_URL?.trim();

  if (!returnUrl || !/^https:\/\//i.test(returnUrl)) {
    return null;
  }

  const separator = returnUrl.includes("?") ? "&" : "?";

  return {
    success: returnUrl + separator + "payment=success",
    pending: returnUrl + separator + "payment=pending",
    failure: returnUrl + separator + "payment=failure",
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = getAllowedOrigin(request);
  const response = new NextResponse(null, { status: 204 });

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export async function POST(request: NextRequest) {
  const accessToken = await getMercadoPagoAccessToken();

  if (!accessToken) {
    return jsonResponse(
      request,
      { error: "Mercado Pago todavía no está configurado. Falta MERCADO_PAGO_ACCESS_TOKEN." },
      503,
    );
  }

  let payload: CheckoutRequest;

  try {
    payload = (await request.json()) as CheckoutRequest;
  } catch {
    return jsonResponse(request, { error: "El pedido no tiene un formato válido." }, 400);
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0 || payload.items.length > 50) {
    return jsonResponse(request, { error: "El pedido está vacío o supera el máximo permitido." }, 400);
  }

  const content = await getSiteContent();
  const mercadoPagoItems: MercadoPagoItem[] = [];

  for (const rawItem of payload.items) {
    const id = Number(rawItem.id);
    const quantity = normalizeQuantity(rawItem.quantity);
    const kind = rawItem.kind === "pack" ? "pack" : rawItem.kind === "lot" ? "lot" : "product";

    if (!Number.isFinite(id) || id <= 0) {
      return jsonResponse(request, { error: "Uno de los artículos no es válido." }, 400);
    }

    if (kind === "product") {
      const product = content.products.find((candidate) => candidate.id === id);

      if (!product || String(product.status).toLowerCase() === "inactive") {
        return jsonResponse(request, { error: "Uno de los productos ya no está disponible." }, 409);
      }

      const measure = rawItem.measureId
        ? product.measures?.find((candidate) => candidate.id === String(rawItem.measureId))
        : undefined;

      if (rawItem.measureId && !measure) {
        return jsonResponse(request, { error: "La medida seleccionada ya no está disponible." }, 409);
      }

      const unitPrice = resolveProductUnitPrice(product, measure ?? null);

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return jsonResponse(request, { error: "Uno de los productos no tiene un precio válido." }, 409);
      }

      mercadoPagoItems.push({
        id: "product-" + product.id + (measure ? "-" + measure.id : ""),
        title: product.name + (measure ? " - " + measure.label : ""),
        description: product.sku,
        currency_id: "ARS",
        quantity,
        unit_price: unitPrice,
      });
      continue;
    }

    if (kind === "pack") {
      const pack = content.packs?.find((candidate) => candidate.id === id && candidate.active !== false);

      if (!pack || !Number.isFinite(Number(pack.publicPrice)) || Number(pack.publicPrice) <= 0) {
        return jsonResponse(request, { error: "Una de las promociones ya no está disponible." }, 409);
      }

      mercadoPagoItems.push({
        id: "pack-" + pack.id,
        title: pack.title,
        description: pack.category,
        currency_id: "ARS",
        quantity,
        unit_price: Number(pack.publicPrice),
      });
      continue;
    }

    const lotId = Number(rawItem.lotId ?? rawItem.id);
    const lot = content.productLots?.find((candidate) => candidate.id === lotId);
    const reservation = rawItem.reservationId
      ? content.productLotReservations?.find(
          (candidate) => candidate.id === Number(rawItem.reservationId) && candidate.lotId === lotId,
        )
      : undefined;

    if (!lot || !["open", "in_production", "sold_out"].includes(String(lot.status).toLowerCase())) {
      return jsonResponse(request, { error: "Uno de los lotes ya no está disponible." }, 409);
    }

    const lotQuantity = reservation ? Math.min(quantity, Math.max(1, reservation.quantity)) : Math.min(quantity, Math.max(0, lot.availableUnits));
    const lotPrice = Number(reservation?.unitPrice ?? lot.lotUnitPrice);

    if (lotQuantity <= 0 || !Number.isFinite(lotPrice) || lotPrice <= 0) {
      return jsonResponse(request, { error: "La reserva de lote no tiene disponibilidad o precio válido." }, 409);
    }

    mercadoPagoItems.push({
      id: "lot-" + lot.id + (reservation ? "-reservation-" + reservation.id : ""),
      title: lot.title,
      description: lot.productSku,
      currency_id: "ARS",
      quantity: lotQuantity,
      unit_price: lotPrice,
    });
  }

  const payerName = String(payload.payer?.name ?? "").trim();
  const payerParts = payerName.split(/\s+/).filter(Boolean);
  const payerEmail = normalizeEmail(payload.payer?.email);
  const returnUrls = getReturnUrls();
  const preferenceBody: Record<string, unknown> = {
    items: mercadoPagoItems,
    external_reference: "EOC-" + crypto.randomUUID(),
    statement_descriptor: "ES OTRA COSA",
    metadata: {
      source: "web",
      cart_items: mercadoPagoItems.length,
    },
  };

  if (payerEmail || payerParts.length > 0) {
    preferenceBody.payer = {
      email: payerEmail || undefined,
      name: payerParts[0] || undefined,
      surname: payerParts.slice(1).join(" ") || undefined,
    };
  }

  if (returnUrls) {
    preferenceBody.back_urls = returnUrls;
    preferenceBody.auto_return = "approved";
  }

  const notificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL?.trim();
  if (notificationUrl && /^https:\/\//i.test(notificationUrl)) {
    preferenceBody.notification_url = notificationUrl;
  }

  const mercadoPagoResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preferenceBody),
    cache: "no-store",
  });

  const mercadoPagoPayload = (await mercadoPagoResponse.json().catch(() => ({}))) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
    error?: string;
  };

  if (!mercadoPagoResponse.ok) {
    console.error("[mercado-pago] preference error", mercadoPagoResponse.status, mercadoPagoPayload);
    return jsonResponse(
      request,
      { error: mercadoPagoPayload.message || mercadoPagoPayload.error || "Mercado Pago rechazó la preferencia." },
      502,
    );
  }

  const useSandbox = process.env.MERCADO_PAGO_USE_SANDBOX === "true";
  const checkoutUrl = useSandbox
    ? mercadoPagoPayload.sandbox_init_point || mercadoPagoPayload.init_point
    : mercadoPagoPayload.init_point;

  if (!mercadoPagoPayload.id || !checkoutUrl) {
    return jsonResponse(request, { error: "Mercado Pago no devolvió un enlace de pago." }, 502);
  }

  return jsonResponse(request, {
    preferenceId: mercadoPagoPayload.id,
    checkoutUrl,
  });
}
