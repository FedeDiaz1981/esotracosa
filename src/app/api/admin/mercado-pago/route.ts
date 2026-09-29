import { NextRequest, NextResponse } from "next/server";
import { requireAdminViewer } from "@/infrastructure/auth/pintofruta-auth";
import { getMercadoPagoConfigurationStatus, saveMercadoPagoAccessToken } from "@/infrastructure/mercado-pago-config";

export async function GET() {
  try {
    await requireAdminViewer();
    return NextResponse.json(await getMercadoPagoConfigurationStatus());
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminViewer();
    const body = await request.json() as { accessToken?: unknown };
    await saveMercadoPagoAccessToken(String(body.accessToken ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la configuración." }, { status: 400 });
  }
}
