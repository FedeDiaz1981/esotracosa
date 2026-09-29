import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoAccessToken } from "@/infrastructure/mercado-pago-config";

type MercadoPagoPaymentMethod = {
  id?: string;
  name?: string;
  payment_type_id?: string;
  status?: string;
  min_allowed_amount?: number;
  max_allowed_amount?: number;
};

type MercadoPagoInstallmentResponse = {
  payer_costs?: Array<{
    installments?: number;
    installment_amount?: number;
    total_amount?: number;
    installment_rate?: number;
    recommended_message?: string;
  }>;
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
  response.headers.set("Cache-Control", status >= 400 ? "no-store" : "private, max-age=300");

  return response;
}

export async function OPTIONS(request: NextRequest) {
  const origin = getAllowedOrigin(request);
  const response = new NextResponse(null, { status: 204 });

  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export async function GET(request: NextRequest) {
  const accessToken = await getMercadoPagoAccessToken();
  if (!accessToken) {
    return jsonResponse(request, { error: "Mercado Pago todavía no está configurado." }, 503);
  }

  const amount = Number(request.nextUrl.searchParams.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponse(request, { error: "El precio de lista no es válido." }, 400);
  }

  const mercadoPagoResponse = await fetch("https://api.mercadopago.com/v1/payment_methods", {
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await mercadoPagoResponse.json().catch(() => [])) as MercadoPagoPaymentMethod[] | { message?: string };

  if (!mercadoPagoResponse.ok || !Array.isArray(payload)) {
    const message = Array.isArray(payload) ? undefined : payload.message;
    console.error("[mercado-pago] payment methods error", mercadoPagoResponse.status, payload);
    return jsonResponse(request, { error: message || "No se pudieron consultar los medios de pago." }, 502);
  }

  const paymentMethods = payload
    .filter((method) => method.status === "active")
    .filter((method) => method.min_allowed_amount == null || amount >= Number(method.min_allowed_amount))
    .filter((method) => method.max_allowed_amount == null || amount <= Number(method.max_allowed_amount))
    .filter((method) => method.id && method.name && method.payment_type_id)
    .map((method) => ({
      id: String(method.id),
      name: String(method.name),
      paymentTypeId: String(method.payment_type_id),
    }));

  const cardMethods = paymentMethods
    .filter((method) => ["credit_card", "debit_card", "prepaid_card"].includes(method.paymentTypeId))
    .slice(0, 12);
  const installmentResponses = await Promise.all(cardMethods.map(async (method) => {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payment_methods/installments?amount=${encodeURIComponent(String(amount))}&payment_method_id=${encodeURIComponent(method.id)}`, {
        headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" },
        cache: "no-store",
      });
      const installmentPayload = await response.json().catch(() => []) as MercadoPagoInstallmentResponse[];
      return response.ok && Array.isArray(installmentPayload) ? { method, installmentPayload } : null;
    } catch {
      return null;
    }
  }));
  const rawInstallmentPlans = installmentResponses.flatMap((result) => {
    if (!result) return [];
    return result.installmentPayload.flatMap((option) => {
      const eligibleCosts = (option.payer_costs ?? []).filter(
        (cost) => Number(cost.installments) > 1 && Number(cost.installment_amount) > 0 && Number(cost.total_amount) > 0,
      );
      return eligibleCosts.map((cost) => ({
        paymentMethodId: result.method.id,
        paymentMethodName: result.method.name,
        installments: Number(cost.installments),
        installmentAmount: Number(cost.installment_amount),
        totalAmount: Number(cost.total_amount),
        installmentRate: Number(cost.installment_rate ?? 0),
        message: String(cost.recommended_message ?? ""),
      }));
    });
  });
  const installmentPlans = Array.from(
    new Map(rawInstallmentPlans.map((plan) => [
      `${plan.paymentMethodId}-${plan.installments}-${plan.installmentAmount}-${plan.totalAmount}`,
      plan,
    ])).values(),
  ).sort((left, right) => left.installments - right.installments || left.totalAmount - right.totalAmount);

  return jsonResponse(request, { paymentMethods, installmentPlans });
}
