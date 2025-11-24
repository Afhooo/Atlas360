import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

type ApprovalStatus = 'approved' | 'rejected';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status, note, ticket, approver } = await req.json();

    if (!params.id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status inválido' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const fields = {
      approval_status: status as ApprovalStatus,
      approval_note: note?.trim() || null,
      approval_ticket: ticket?.trim() || null,
      approved_by: approver?.trim() || null,
      approved_at: now,
    };

    const { error } = await supabaseAdmin()
      .from('promoter_sales')
      .update(fields)
      .eq('id', params.id);

    if (error) {
      console.error('[promoters/sales/:id PATCH] supabase error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 400 });
  }
}
