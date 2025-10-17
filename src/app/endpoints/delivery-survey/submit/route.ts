// src/app/endpoints/delivery-survey/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

type SurveyPayload = {
  token?: string;
  satisfaction?: number;
  deliveryMet?: boolean;
  recommendation?: number;
  productExpectation?: boolean;
  comments?: string;
};

const isValidScore = (value: unknown, min: number, max: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return false;
  return value >= min && value <= max;
};

export async function POST(request: NextRequest) {
  const body = (await request
    .json()
    .catch(() => ({}))) as SurveyPayload | undefined;

  if (!body?.token) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 400 });
  }

  if (!isValidScore(body.satisfaction, 1, 5)) {
    return NextResponse.json({ ok: false, error: 'invalid_satisfaction' }, { status: 400 });
  }

  if (typeof body.deliveryMet !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'invalid_delivery_met' }, { status: 400 });
  }

  if (!isValidScore(body.recommendation, 0, 10)) {
    return NextResponse.json({ ok: false, error: 'invalid_recommendation' }, { status: 400 });
  }

  if (typeof body.productExpectation !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'invalid_product_expectation' }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const linkResult = await admin
    .from('delivery_survey_links')
    .select('id, order_id, consumed_at')
    .eq('survey_token', body.token)
    .maybeSingle();

  if (linkResult.error) {
    return NextResponse.json(
      { ok: false, error: linkResult.error.message },
      { status: 502 }
    );
  }

  const link = linkResult.data;

  if (!link) {
    return NextResponse.json({ ok: false, error: 'token_not_found' }, { status: 404 });
  }

  if (link.consumed_at) {
    return NextResponse.json({ ok: false, error: 'token_consumed' }, { status: 409 });
  }

  const insertResult = await admin
    .from('delivery_survey_responses')
    .insert({
      survey_link_id: link.id,
      order_id: link.order_id,
      satisfaction_score: body.satisfaction,
      delivery_met_expectations: body.deliveryMet,
      recommendation_score: body.recommendation,
      product_expectation: body.productExpectation,
      comments: body.comments?.trim() ? body.comments.trim() : null,
    })
    .select('id')
    .single();

  if (insertResult.error) {
    return NextResponse.json(
      { ok: false, error: insertResult.error.message },
      { status: 502 }
    );
  }

  await admin
    .from('delivery_survey_links')
    .update({
      consumed_at: new Date().toISOString(),
      send_status: 'completed',
    })
    .eq('id', link.id);

  return NextResponse.json({ ok: true });
}
