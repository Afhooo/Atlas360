import { NextResponse } from 'next/server';
import { supabaseAdmin, withSupabaseRetry, isSupabaseTransientError } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let sb;
  try {
    sb = supabaseAdmin();
  } catch (err: any) {
    console.error('Error creando cliente Supabase:', err);
    return NextResponse.json({ error: 'Configuración de Supabase inválida' }, { status: 500 });
  }
  try {
    const { data, error } = await withSupabaseRetry(async () => {
      return await sb
        .from('monthly_sales_summary')
        .select('*')
        .order('summary_date', { ascending: true });
    });

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    if (isSupabaseTransientError(e)) {
      console.error('Error transitorio en sales-summary:', e);
      return NextResponse.json(
        { error: 'Supabase no respondió a tiempo. Intenta nuevamente.' },
        { status: 503 }
      );
    }
    console.error(`Error en API de sales-summary: ${e?.message || e}`);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
