import { NextResponse } from 'next/server';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TZ = process.env.APP_TIMEZONE || 'America/La_Paz';

type Range = { start: string; end: string };

function dateKey(daysOffset = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

function dayRange(key: string): Range {
  return { start: `${key}T00:00:00`, end: `${key}T23:59:59.999` };
}

function weekRange(): Range {
  const now = new Date();
  const dow = now.getUTCDay(); // 0-6
  const offset = dow === 0 ? -6 : 1 - dow; // lunes como inicio
  const startKey = dateKey(offset);
  const start = `${startKey}T00:00:00`;
  const endDate = new Date(start);
  endDate.setUTCDate(endDate.getUTCDate() + 7);
  const endKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(endDate);
  return { start, end: `${endKey}T00:00:00` };
}

function monthRange(): Range {
  const key = dateKey(0).slice(0, 7); // yyyy-mm
  const start = `${key}-01T00:00:00`;
  const startDate = new Date(`${key}-01T00:00:00Z`);
  const nextMonth = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1));
  const nextKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(nextMonth);
  return { start, end: `${nextKey}T00:00:00` };
}

type OrdersAgg = { revenue: number; tickets: number; units: number };

function aggregateOrders(rows: any[], range: Range): OrdersAgg {
  const orderIds = new Set<string>();
  let revenue = 0;
  let units = 0;

  for (const row of rows) {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const created = order?.created_at ? new Date(order.created_at) : null;
    if (!created) continue;
    const iso = created.toISOString();
    if (iso < range.start || iso >= range.end) continue;
    revenue += Number(row.subtotal ?? 0);
    units += Number(row.quantity ?? 0);
    if (row.order_id) orderIds.add(String(row.order_id));
  }

  return { revenue, tickets: orderIds.size, units };
}

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const dayKeyToday = dateKey(0);
    const day = dayRange(dayKeyToday);
    const week = weekRange();
    const month = monthRange();

    // Ventas: traemos items del mes y derivamos rangos menores
    const { data: orderItems, error: itemsError } = await withSupabaseRetry(async () =>
      sb
        .from('order_items')
        .select('order_id, quantity, subtotal, orders!inner(created_at)')
        .gte('orders.created_at', month.start)
        .lt('orders.created_at', month.end)
    );
    if (itemsError) throw itemsError;

    const todayAgg = aggregateOrders(orderItems || [], day);
    const weekAgg = aggregateOrders(orderItems || [], week);
    const monthAgg = aggregateOrders(orderItems || [], month);

    // Devoluciones de hoy
    const { data: returnsData, error: returnsError } = await withSupabaseRetry(async () =>
      sb
        .from('product_returns')
        .select('return_amount')
        .eq('return_date', dayKeyToday)
    );
    if (returnsError) throw returnsError;
    const returnsAmount = (returnsData || []).reduce((sum, r) => sum + Number(r.return_amount ?? 0), 0);

    // Asistencia de hoy
    const { data: attendanceData, error: attendanceError } = await withSupabaseRetry(async () =>
      sb
        .from('attendance')
        .select('person_id')
        .gte('created_at', day.start)
        .lt('created_at', day.end)
    );
    if (attendanceError) throw attendanceError;
    const attendancePeople = new Set<string>();
    (attendanceData || []).forEach((a) => a.person_id && attendancePeople.add(String(a.person_id)));

    return NextResponse.json(
      {
        ok: true,
        today: todayAgg,
        week: weekAgg,
        month: monthAgg,
        returnsToday: { count: (returnsData || []).length, amount: returnsAmount },
        attendanceToday: { marks: attendanceData?.length ?? 0, people: attendancePeople.size },
        cash: { today: todayAgg.revenue, month: monthAgg.revenue }, // placeholder: usa órdenes como proxy
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    if (isSupabaseTransientError(e)) {
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
