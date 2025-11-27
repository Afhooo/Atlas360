import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseAdmin();
  const id = params.id;

  try {
    const { data: customer, error } = await withSupabaseRetry(async () =>
      sb.from('customers').select('*').eq('id', id).maybeSingle()
    );
    if (error) throw error;
    if (!customer) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    const { data: orders, error: ordersError } = await withSupabaseRetry(async () =>
      sb
        .from('orders')
        .select('id, order_no, amount, created_at, status')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
    );
    if (ordersError) throw ordersError;

    const { data: opps, error: oppsError } = await withSupabaseRetry(async () =>
      sb
        .from('opportunities')
        .select('id, title, stage, amount, close_date, owner_id')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
    );
    if (oppsError) throw oppsError;

    return NextResponse.json({
      ok: true,
      customer,
      orders: orders ?? [],
      opportunities: opps ?? [],
    });
  } catch (error: any) {
    if (isSupabaseTransientError(error)) {
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[customers/:id GET]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'server_error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseAdmin();
  const id = params.id;

  try {
    const body = (await req.json()) as Partial<{
      name: string;
      email: string | null;
      phone: string | null;
      channel: string | null;
      segment: string | null;
      notes: string | null;
    }>;

    const patch: Record<string, unknown> = {};
    if (typeof body.name === 'string') patch.name = body.name.trim();
    if (typeof body.email === 'string') patch.email = body.email.trim() || null;
    if (typeof body.phone === 'string') patch.phone = body.phone.trim() || null;
    if (typeof body.channel === 'string') patch.channel = body.channel.trim() || null;
    if (typeof body.segment === 'string') patch.segment = body.segment.trim() || null;
    if (typeof body.notes === 'string') patch.notes = body.notes.trim() || null;

    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: false, error: 'nothing_to_update' }, { status: 400 });
    }

    const { data, error } = await withSupabaseRetry(async () =>
      sb.from('customers').update(patch).eq('id', id).select('*').maybeSingle()
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, customer: data });
  } catch (error: any) {
    if (isSupabaseTransientError(error)) {
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[customers/:id PATCH]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'server_error' }, { status: 500 });
  }
}

