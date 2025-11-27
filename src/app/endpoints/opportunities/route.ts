import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OpportunityRow = {
  id: string;
  customer_id: string | null;
  title: string | null;
  description: string | null;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  owner_id: string | null;
  probability: number | null;
  close_date: string | null;
  source: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const sb = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const stage = (searchParams.get('stage') || '').trim();
  const q = (searchParams.get('q') || '').trim();

  try {
    let base = sb
      .from('opportunities')
      .select('*, customers:customer_id(name), owner:owner_id(full_name)')
      .order('created_at', { ascending: false });

    if (stage) base = base.eq('stage', stage);
    if (q) {
      base = base.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,source.ilike.%${q}%`
      );
    }

    const { data, error } = await withSupabaseRetry(async () => base);
    if (error) throw error;

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error: any) {
    if (isSupabaseTransientError(error)) {
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[opportunities/GET]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'server_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin();
  try {
    const body = (await req.json()) as Partial<OpportunityRow> & {
      title?: string;
      customer_id?: string | null;
      stage?: string;
      amount?: number | null;
      close_date?: string | null;
      source?: string | null;
    };

    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ ok: false, error: 'El título es obligatorio' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      title,
      customer_id: body.customer_id ?? null,
      description: body.description || null,
      stage: (body.stage || 'LEAD').toUpperCase(),
      amount: body.amount ?? null,
      currency: body.currency || 'BOB',
      owner_id: body.owner_id ?? null,
      probability: body.probability ?? null,
      close_date: body.close_date ?? null,
      source: body.source ?? null,
    };

    const { data, error } = await withSupabaseRetry(async () =>
      sb.from('opportunities').insert(payload).select('*, customers:customer_id(name)').maybeSingle()
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, opportunity: data }, { status: 201 });
  } catch (error: any) {
    if (isSupabaseTransientError(error)) {
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[opportunities/POST]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'server_error' }, { status: 500 });
  }
}

