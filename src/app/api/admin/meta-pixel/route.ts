import { NextRequest, NextResponse } from "next/server";
import { requireAdminViewer } from "@/infrastructure/auth/pintofruta-auth";
import { getMetaPixelConfigurationStatus, saveMetaPixelId } from "@/infrastructure/meta-pixel-config";

export async function GET() {
  try {
    await requireAdminViewer();
    return NextResponse.json(await getMetaPixelConfigurationStatus());
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminViewer();
    const body = await request.json() as { pixelId?: unknown };
    await saveMetaPixelId(String(body.pixelId ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la configuración." }, { status: 400 });
  }
}
