import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = supabaseAdmin();
    // Pedimos SOLO lo que sabemos que existe: full_name (+ active)
    const { data, error } = await supabase
      .from('people')
      .select('full_name, active')
      .eq('active', true)
      .order('full_name', { ascending: true });

    if (error) throw error;

    // Mapeamos sin depender de un id
    const items = (data || [])
      .map((p) => ({ name: String(p.full_name) }))
      .filter((p) => p.name.trim().length > 0);

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error('[promoters/list] error', e?.message || e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
