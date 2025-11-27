import { NextResponse } from 'next/server';
import { isDemoMode, demoTodayReturns } from '@/lib/demo/mockData';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getTodayInLaPaz() {
    const now = new Date();
    const dateInLaPaz = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/La_Paz',
    }).format(now);
    return dateInLaPaz;
}

export async function GET() {
    if (isDemoMode()) {
        return NextResponse.json(demoTodayReturns, { status: 200 });
    }

    try {
        const supabase = supabaseAdmin();
        const today = getTodayInLaPaz();

        const { data, error, count } = await supabase
            .from('product_returns')
            .select('return_amount', { count: 'exact', head: false })
            .eq('return_date', today);

        if (error) {
            throw new Error(error.message);
        }

        const totalAmount = data.reduce((sum, row) => sum + (row.return_amount || 0), 0);

        return NextResponse.json({
            count: count || 0,
            amount: totalAmount,
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
