import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sb = supabaseAdmin();
  const id = params.id;

  try {
    const body = (await req.json()) as Partial<{
      title: string;
      description: string;
      stage: string;
      amount: number;
      probability: number;
      close_date: string;
      owner_id: string | null;
    }>;

    const patch: Record<string, unknown> = {};
    if (typeof body.title === 'string') patch.title = body.title.trim();
    if (typeof body.description === 'string') patch.description = body.description.trim();
    if (typeof body.stage === 'string') patch.stage = body.stage.toUpperCase();
    if (typeof body.amount === 'number') patch.amount = body.amount;
    if (typeof body.probability === 'number') patch.probability = body.probability;
    if (typeof body.close_date === 'string') patch.close_date = body.close_date;
    if (body.owner_id !== undefined) patch.owner_id = body.owner_id;

    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: false, error: 'nothing_to_update' }, { status: 400 });
    }

    const { data, error } = await withSupabaseRetry(async () =>
      sb.from('opportunities').update(patch).eq('id', id).select('*').maybeSingle()
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, opportunity: data });
  } catch (error: any) {
    if (isSupabaseTransientError(error)) {
      return NextResponse.json({ ok: false, error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[opportunities/:id PATCH]', error);
    return NextResponse.json({ ok: false, error: error?.message || 'server_error' }, { status: 500 });
  }
}

