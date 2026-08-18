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
  if (!viewer?.authenticated) {
    return NextResponse.json({ ok: false, error: "Tenés que iniciar sesión." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { reservationId?: number; reason?: string };
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
      lot_id: number;
      user_id: number;
      quantity: number;
      status: string;
      lot_total_units: number;
      lot_reserved_units: number;
      lot_status: string;
      lot_updated_at: string;
      auth_user_id: string | null;
      reservation_status: string;
    }>(
      `
        select
          r.id,
          r.lot_id,
          r.user_id,
          r.quantity,
          r.status,
          pl.total_units as lot_total_units,
          pl.reserved_units as lot_reserved_units,
          pl.status as lot_status,
          pl.updated_at as lot_updated_at,
          u.auth_user_id,
          r.status as reservation_status
        from product_lot_reservations r
        inner join product_lots pl on pl.id = r.lot_id
        inner join users u on u.id = r.user_id
        where r.id = $1
          and r.status in ('reserved', 'confirmed')
        for update
        limit 1
      `,
      [reservationId],
    );

    const reservation = reservationResult.rows[0];
    if (!reservation) {
      throw new Error("La reserva no existe o ya fue cancelada.");
    }

    if (!viewer.isAdmin && reservation.auth_user_id !== viewer.authUserId) {
      throw new Error("No podés cancelar esta reserva.");
    }

    const nextReservedUnits = Math.max(0, Number(reservation.lot_reserved_units) - Number(reservation.quantity));
    const lotReopened = reservation.lot_status === "sold_out" && nextReservedUnits < Number(reservation.lot_total_units);
    const nextStatus = lotReopened ? "open" : reservation.lot_status;

    await client.query(
      `
        update product_lots
        set reserved_units = $2,
            status = $3,
            completed_at = case when $4 then null else completed_at end,
            updated_at = now()
        where id = $1
      `,
      [reservation.lot_id, nextReservedUnits, nextStatus, lotReopened],
    );

    await client.query(
      `
        update product_lot_reservations
        set status = 'cancelled',
            cancel_reason = coalesce($2, cancel_reason),
            cancelled_at = now(),
            cancelled_by_user_id = $3,
            updated_at = now()
        where id = $1
      `,
      [reservationId, body.reason ? String(body.reason).trim() : null, viewer.isAdmin ? viewer.userId : null],
    );

    await client.query("commit");

    return NextResponse.json({
      ok: true,
      lot: {
        availableUnits: Math.max(0, Number(reservation.lot_total_units) - nextReservedUnits),
        reservedUnits: nextReservedUnits,
        status: nextStatus,
      },
    });
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Si la conexión murió, dejamos que el error original suba.
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo cancelar la reserva.",
      },
      { status: 400 },
    );
  } finally {
    client.release();
  }
}
