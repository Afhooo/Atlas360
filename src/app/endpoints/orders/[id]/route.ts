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
    const { data: order, error } = await sb
      .from('orders')
      .select('id, status, sales_user_id, seller')
      .eq('id', params.id)
      .maybeSingle();

    if (error) {
      console.error('[orders/:id DELETE] fetch error', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ ok: false, error: 'venta no encontrada' }, { status: 404 });
    }

    const roleUpper = (session.role || '').toUpperCase();
    const isApproverRole = APPROVER_ROLES.has(roleUpper);
    const isOwner = order.sales_user_id && order.sales_user_id === session.personId;
    const ownerByName =
      order.seller &&
      session.name &&
      order.seller.trim().toLowerCase() === session.name.trim().toLowerCase();

    const status = (order.status || '').toString().toLowerCase();
    const isValidated = status && status !== 'pending';

    if (isValidated && !isApproverRole) {
      return NextResponse.json(
        { ok: false, error: 'Esta venta ya fue validada/asignada. Solo un aprobador puede eliminarla.' },
        { status: 403 }
      );
    }

    if (!isValidated && !(isOwner || ownerByName || isApproverRole)) {
      return NextResponse.json(
        { ok: false, error: 'Solo el dueño de la venta o un aprobador puede eliminarla.' },
        { status: 403 }
      );
    }

    // Borra primero items para evitar problemas de FK si no hay cascade.
    const { error: itemsErr } = await sb.from('order_items').delete().eq('order_id', params.id);
    if (itemsErr) {
      console.warn('[orders/:id DELETE] items delete warning', itemsErr.message);
    }

    const { error: delErr } = await sb.from('orders').delete().eq('id', params.id);
    if (delErr) {
      console.error('[orders/:id DELETE] delete error', delErr);
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[orders/:id DELETE] server_error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
