// app/endpoints/products/route.ts  (misma funcionalidad; solo lazy init + runtime node)
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new globalThis.URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Number(searchParams.get('limit') ?? 8);

  if (q.length < 2) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const supabase = supabaseAdmin(); // ← lazy init

  const { data, error } = await supabase
    .from('products')
    .select('code, name, retail_price, stock')
    .or(`code.ilike.%${q}%,name.ilike.%${q}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}
