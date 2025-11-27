import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';
import { isDemoMode, demoCustomers } from '@/lib/demo/mockData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  channel: string | null;
  segment: string | null;
  created_at: string;
  owner_id: string | null;
};

type OrdersAggRow = {
  customer_id: string | null;
  total_amount: number | null;
  orders_count: number | null;
  last_order_at: string | null;
};

export async function GET(req: NextRequest) {
  const demoMode = isDemoMode();
  const sb = demoMode ? null : supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    if (demoMode) {
      const needle = q.toLowerCase();
      let data = demoCustomers;
      if (needle) {
        data = data.filter((customer) => {
          const haystack = [
            customer.name,
            customer.email,
            customer.phone,
            customer.channel,
            customer.segment,
            customer.city,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(needle);
        });
      }

      const total = data.length;
      const paged = data.slice(from, to + 1);
      return NextResponse.json({
        ok: true,
        data: paged,
        page,
        pageSize,
        total,
      });
    }

    if (!sb) {
      return NextResponse.json({ ok: false, error: 'supabase_client_unavailable' }, { status: 500 });
    }

    let baseQuery = sb
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (q) {
      baseQuery = baseQuery.or(
        `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,channel.ilike.%${q}%,segment.ilike.%${q}%`
      );
    }

    const { data: customers, error, count } = await withSupabaseRetry(async () =>
      baseQuery.range(from, to)
    );
    if (error) throw error;

    const rows = (customers || []) as CustomerRow[];
    const ids = rows.map((c) => c.id);

    let byCustomer: Record<string, OrdersAggRow> = {};

    if (ids.length) {
      const { data: agg, error: aggError } = await withSupabaseRetry(async () =>
        sb
          .from('orders')
          .select('customer_id, amount, created_at')
          .in('customer_id', ids)
      );
      if (aggError) throw aggError;

      const map: Record<string, OrdersAggRow> = {};
      (agg || []).forEach((row: any) => {
        const id = row.customer_id as string | null;
        if (!id) return;
        const current = map[id] || {
          customer_id: id,
          total_amount: 0,
          orders_count: 0,
          last_order_at: null,
        };
        const amount = Number(row.amount ?? 0);
        const created = row.created_at ? String(row.created_at) : null;
        current.total_amount = (current.total_amount ?? 0) + amount;
        current.orders_count = (current.orders_count ?? 0) + 1;
        if (created && (!current.last_order_at || created > current.last_order_at)) {
          current.last_order_at = created;
        }
        map[id] = current;
      });
      byCustomer = map;
    }

    const enriched = rows.map((c) => {
      const agg = byCustomer[c.id] || null;
      return {
        ...c,
        ltv: agg?.total_amount ?? 0,
        orders_count: agg?.orders_count ?? 0,
        last_order_at: agg?.last_order_at ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      data: enriched,
      page,
      pageSize,
      total: count ?? enriched.length,
    });
  } catch (error: any) {
    if (isSupabaseTransientError(error)) {
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[customers/GET]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const demoMode = isDemoMode();
  const sb = demoMode ? null : supabaseAdmin();

  try {
    const body = (await req.json()) as Partial<CustomerRow> & {
      name?: string;
      email?: string | null;
      phone?: string | null;
      channel?: string | null;
      segment?: string | null;
      notes?: string | null;
    };

    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ ok: false, error: 'El nombre es obligatorio' }, { status: 400 });
    }

    if (demoMode) {
      return NextResponse.json(
        {
          ok: true,
          customer: {
            id: `cust-demo-${Date.now()}`,
            name,
            email: body.email?.trim() || null,
            phone: body.phone?.trim() || null,
            channel: body.channel?.trim() || 'Retail',
            segment: body.segment?.trim() || 'Prospecto',
            created_at: new Date().toISOString(),
            owner_id: null,
            ltv: 0,
            orders_count: 0,
            last_order_at: null,
          },
        },
        { status: 201 }
      );
    }

    const payload: Record<string, unknown> = {
      name,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      channel: body.channel?.trim() || null,
      segment: body.segment?.trim() || null,
      notes: body.notes?.trim() || null,
    };

    const { data, error } = await withSupabaseRetry(async () =>
      sb!.from('customers').insert(payload).select('*').maybeSingle()
    );

    if (error) throw error;

    return NextResponse.json({ ok: true, customer: data }, { status: 201 });
  } catch (error: any) {
    if (isSupabaseTransientError(error)) {
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[customers/POST]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'server_error' }, { status: 500 });
  }
}
