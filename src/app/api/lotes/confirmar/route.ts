import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/infrastructure/auth/pintofruta-auth";
import { ensureSiteContentSchema } from "@/infrastructure/db/ensure-site-content-schema";
import { postgresPool } from "@/infrastructure/db/postgres";

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
  if (!viewer?.authenticated || !viewer.isAdmin) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { reservationId?: number };
  const reservationId = toNumber(body.reservationId);

  if (!reservationId) {
    return NextResponse.json({ ok: false, error: "Falta la reserva." }, { status: 400 });
  }

  await ensureSiteContentSchema();

  const client = await postgresPool.connect();

  try {
    await client.query("begin");

    const reservationResult = await client.query<{
      id: number;
      status: string;
    }>(
      `
        select id, status
        from product_lot_reservations
        where id = $1
        for update
        limit 1
      `,
      [reservationId],
    );

    const reservation = reservationResult.rows[0];
    if (!reservation) {
      throw new Error("La reserva no existe.");
    }

    if (reservation.status === "cancelled") {
      throw new Error("No se puede confirmar una reserva anulada.");
    }

    await client.query(
      `
        update product_lot_reservations
        set status = 'confirmed',
            confirmed_at = coalesce(confirmed_at, now()),
            confirmed_by_user_id = $2,
            updated_at = now()
        where id = $1
      `,
      [reservationId, viewer.userId],
    );

    await client.query("commit");

    return NextResponse.json({ ok: true });
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo confirmar la reserva.",
      },
      { status: 400 },
    );
  } finally {
    client.release();
  }
}
