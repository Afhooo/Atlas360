import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase';

const COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const APPROVER_ROLES = new Set(['ADMIN', 'GERENCIA', 'COORDINADOR', 'LIDER']);

const parseSession = (req: NextRequest) => {
  const cookie = req.cookies.get(COOKIE)?.value;
  if (!cookie) return null;
  try {
    const payload = jwt.verify(cookie, JWT_SECRET) as any;
    const personId = String(payload?.sub || '').trim();
    const role = String(payload?.role || payload?.fenix_role || '').trim().toUpperCase();
    const name =
      (typeof payload?.name === 'string' && payload.name) ||
      (typeof payload?.full_name === 'string' && payload.full_name) ||
      (typeof payload?.username === 'string' && payload.username) ||
      '';
    if (!personId) return null;
    return { personId, role, name };
  } catch {
    return null;
  }
};

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!params?.id) {
      return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });
    }

    const session = parseSession(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 });
    }

    const sb = supabaseAdmin();
    const { data: sale, error } = await sb
      .from('promoter_sales')
      .select('id, promoter_person_id, approval_status, approved_by')
      .eq('id', params.id)
      .maybeSingle();

    if (error) {
      console.error('[my/promoter-sales/:id DELETE] fetch error', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!sale) {
      return NextResponse.json({ ok: false, error: 'venta no encontrada' }, { status: 404 });
    }

    const status = (sale.approval_status || '').toString().toLowerCase();
    const isOwner = sale.promoter_person_id === session.personId;
    const isApproverRole = APPROVER_ROLES.has(session.role);
    const approverName = (session.name || '').trim().toLowerCase();
    const approvedBy = (sale.approved_by || '').toString().trim().toLowerCase();

    const wasApproved = status === 'approved';
    const canDeleteApproved = wasApproved && (isApproverRole || (approvedBy && approverName === approvedBy));
    const canDeletePending = !wasApproved && (isOwner || isApproverRole);

    if (!(canDeleteApproved || canDeletePending)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            wasApproved
              ? 'Solo quien aprobó (o un rol superior) puede eliminar una venta ya validada.'
              : 'Solo el dueño de la venta o un superior puede eliminarla.',
        },
        { status: 403 }
      );
    }

    const { error: delErr } = await sb.from('promoter_sales').delete().eq('id', params.id);
    if (delErr) {
      console.error('[my/promoter-sales/:id DELETE] delete error', delErr);
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[my/promoter-sales/:id DELETE] server_error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
