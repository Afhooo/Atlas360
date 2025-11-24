// /src/app/endpoints/promoters/summary/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseTransientError } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ========= Tipos ========= */
type SummaryRow = {
  sale_date: string;          // ISO YYYY-MM-DD
  promoter_name: string | null;
  items: number | null;
  total_bs: number | null;
  cochabamba: number | null;
  lapaz: number | null;
  elalto: number | null;
  santacruz: number | null;
  sucre: number | null;
  encomienda: number | null;
  tienda: number | null;
};

type OriginKey = 'cochabamba' | 'lapaz' | 'elalto' | 'santacruz' | 'sucre' | 'encomienda' | 'tienda';

function asISODate(input?: string): string {
  // Acepta "DD/MM/YYYY" o "YYYY-MM-DD"
  if (!input) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [dd, mm, yyyy] = input.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return input.slice(0, 10);
}

function last30(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  return { from: f, to: t };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawFrom = url.searchParams.get('from') || '';
    const rawTo = url.searchParams.get('to') || '';
    const rawStatus = (url.searchParams.get('status') || '').toLowerCase();

    const range = (!rawFrom || !rawTo)
      ? last30()
      : { from: asISODate(rawFrom), to: asISODate(rawTo) };

    const status: 'approved' | 'pending' | 'rejected' | 'all' =
      ['approved', 'pending', 'rejected', 'all'].includes(rawStatus) ? (rawStatus as any) : 'approved';

    let query = supabase
      .from('promoter_sales')
      .select('sale_date,promoter_name,origin,quantity,unit_price,approval_status')
      .gte('sale_date', range.from)
      .lte('sale_date', range.to);

    if (status !== 'all') {
      query = query.eq('approval_status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: SummaryRow[] = [];
    const byKey: Record<string, SummaryRow> = {};

    for (const r of data || []) {
      const key = `${r.sale_date}-${r.promoter_name || '—'}`;
      if (!byKey[key]) {
        byKey[key] = {
          sale_date: r.sale_date,
          promoter_name: r.promoter_name || '—',
          items: 0,
          total_bs: 0,
          cochabamba: 0,
          lapaz: 0,
          elalto: 0,
          santacruz: 0,
          sucre: 0,
          encomienda: 0,
          tienda: 0,
        };
      }
      const itemQty = Number(r.quantity || 0);
      const itemTotal = itemQty * Number(r.unit_price || 0);

      byKey[key].items = (byKey[key].items || 0) + itemQty;
      byKey[key].total_bs = (byKey[key].total_bs || 0) + itemTotal;
      if (r.origin && byKey[key][r.origin as keyof SummaryRow] !== undefined) {
        const originKey = r.origin as OriginKey;
        const current = Number(byKey[key][originKey] || 0);
        byKey[key][originKey] = current + itemTotal;
      }
    }

    for (const row of Object.values(byKey)) {
      rows.push(row);
    }

    rows.sort((a, b) => a.sale_date.localeCompare(b.sale_date));

    return NextResponse.json(
      { range, rows },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (e: any) {
    if (isSupabaseTransientError(e)) {
      console.error('[promoters/summary] Supabase temporalmente no disponible:', e.message);
      return NextResponse.json({ error: 'supabase_unavailable' }, { status: 503 });
    }
    console.error('[promoters/summary] server_error:', e);
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 });
  }
}
