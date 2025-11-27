// src/app/endpoints/orders/[id]/survey/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppText, isWhatsAppConfigured } from '@/lib/notifications/whatsapp';

export const runtime = 'nodejs';

type RequestBody = {
  phone?: string | null;
  customerName?: string | null;
  resend?: boolean;
};

const buildOrigin = (req: NextRequest) => {
  const headerOrigin = req.headers.get('origin');
  if (headerOrigin) return headerOrigin;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return host ? `${proto}://${host}` : '';
};

const oneWeekFromNow = () => {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  return expires.toISOString();
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = params.id;
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'missing_order_id' }, { status: 400 });
  }

  const body = (await request
    .json()
    .catch(() => ({}))) as RequestBody | undefined;

  const admin = supabaseAdmin();

  const orderResult = await admin
    .from('orders')
    .select('id, order_no, customer_name, customer_phone')
    .eq('id', orderId)
    .maybeSingle();

  if (orderResult.error) {
    return NextResponse.json(
      { ok: false, error: orderResult.error.message },
      { status: 502 }
    );
  }

  const order = orderResult.data;
  if (!order) {
    return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 404 });
  }

  const phone = body?.phone ?? order.customer_phone;
  if (!phone) {
    return NextResponse.json(
      { ok: true, skipped: 'missing_phone' },
      { status: 200 }
    );
  }

  const customerName =
    body?.customerName ??
    order.customer_name ??
    'Cliente';

  let linkRecordId: string | null = null;
  let tokenToUse: string | null = null;

  if (!body?.resend) {
    const existing = await admin
      .from('delivery_survey_links')
      .select('id, survey_token, send_status, consumed_at')
      .eq('order_id', orderId)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing.error && existing.data && existing.data.send_status !== 'failed') {
      linkRecordId = existing.data.id;
      tokenToUse = existing.data.survey_token;
    }
  }

  if (!tokenToUse) {
    const insertResult = await admin
      .from('delivery_survey_links')
      .insert({
        order_id: orderId,
        survey_token: randomUUID().replace(/-/g, ''),
        customer_phone: phone,
        customer_name: customerName,
        send_status: 'pending',
        expires_at: oneWeekFromNow(),
      })
      .select('id, survey_token')
      .single();

    if (insertResult.error || !insertResult.data) {
      return NextResponse.json(
        { ok: false, error: insertResult.error?.message || 'insert_failed' },
        { status: 502 }
      );
    }

    linkRecordId = insertResult.data.id;
    tokenToUse = insertResult.data.survey_token;
  }

  if (!linkRecordId || !tokenToUse) {
    return NextResponse.json({ ok: false, error: 'token_generation_failed' }, { status: 500 });
  }

  const origin = buildOrigin(request);
  const surveyUrlBase = origin || process.env.NEXT_PUBLIC_APP_URL || '';
  const surveyUrl = `${surveyUrlBase.replace(/\/$/, '')}/encuesta-entrega/${tokenToUse}`;

  if (!isWhatsAppConfigured()) {
    await admin
      .from('delivery_survey_links')
      .update({
        send_status: 'failed',
        send_error: 'whatsapp_not_configured',
        sent_at: new Date().toISOString(),
      })
      .eq('id', linkRecordId);

    return NextResponse.json(
      { ok: false, error: 'whatsapp_not_configured', surveyUrl },
      { status: 503 }
    );
  }

  const shortName = customerName?.split(' ')?.[0] ?? 'Cliente';
  const message = [
    `Hola ${shortName}! Gracias por confiar en Atlas Suite.`,
    '¿Podrías ayudarnos con una encuesta rápida sobre tu entrega?',
    surveyUrl,
  ].join(' ');

  const sendResult = await sendWhatsAppText({
    to: phone,
    message,
    previewUrl: true,
  });

  if (!sendResult.ok) {
    await admin
      .from('delivery_survey_links')
      .update({
        send_status: 'failed',
        send_error: sendResult.error ?? 'unknown_error',
        sent_at: new Date().toISOString(),
      })
      .eq('id', linkRecordId);

    return NextResponse.json(
      {
        ok: false,
        error: sendResult.error ?? 'send_failed',
        surveyUrl,
      },
      { status: sendResult.status && sendResult.status >= 400 ? sendResult.status : 502 }
    );
  }

  await admin
    .from('delivery_survey_links')
    .update({
      send_status: 'sent',
      whatsapp_message_id: sendResult.messageId ?? null,
      sent_at: new Date().toISOString(),
      send_error: null,
    })
    .eq('id', linkRecordId);

  return NextResponse.json({
    ok: true,
    surveyUrl,
    messageId: sendResult.messageId ?? null,
  });
}
