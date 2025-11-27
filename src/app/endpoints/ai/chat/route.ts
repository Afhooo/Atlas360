import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type HistoryItem = { role: 'user' | 'assistant'; content: string };
type Scope = 'general' | 'ventas' | 'cajas' | 'inventario';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

async function fetchJson(origin: string, path: string, req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie');
    const headers: Record<string, string> = {};
    if (cookie) {
      headers.cookie = cookie;
    }

    const res = await fetch(`${origin}${path}`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message: string = body?.message ?? '';
    const history: HistoryItem[] = Array.isArray(body?.history) ? body.history : [];
    const scope: Scope = ['ventas', 'cajas', 'inventario', 'general'].includes(body?.scope)
      ? body.scope
      : 'general';

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ ok: false, error: 'message_required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: 'missing_openai_api_key',
          detail: 'Configura OPENAI_API_KEY en tu .env.local para habilitar el copiloto.',
        },
        { status: 503 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const [
      me,
      overview,
      salesReport,
      returnsReport,
      customers,
      opportunities,
      inventorySummary,
    ] = await Promise.all([
      fetchJson(origin, '/endpoints/me', req),
      fetchJson(origin, '/endpoints/metrics/overview', req),
      scope === 'ventas' || scope === 'general'
        ? fetchJson(origin, '/endpoints/sales-report', req)
        : Promise.resolve(null),
      fetchJson(origin, '/endpoints/returns-report', req),
      scope === 'ventas' || scope === 'general'
        ? fetchJson(origin, '/endpoints/customers?pageSize=50', req)
        : Promise.resolve(null),
      scope === 'ventas' || scope === 'general'
        ? fetchJson(origin, '/endpoints/opportunities', req)
        : Promise.resolve(null),
      scope === 'inventario' || scope === 'general'
        ? fetchJson(origin, '/endpoints/inventory/summary', req)
        : Promise.resolve(null),
    ]);

    // Construimos un contexto compacto para el modelo
    const context: Record<string, unknown> = {};
    if (overview?.ok !== false) context.overview = overview;

    if (Array.isArray(salesReport)) {
      context.salesSample = salesReport.slice(0, 20);
    }
    if (Array.isArray(returnsReport)) {
      context.returnsSample = returnsReport.slice(0, 10);
    }
    if (customers?.ok && Array.isArray(customers.data)) {
      context.topCustomers = customers.data
        .slice(0, 10)
        .map((c: any) => ({ name: c.name, ltv: c.ltv, orders: c.orders_count, segment: c.segment }));
    }
    if (me?.ok) {
      context.user = {
        role: me.role,
        raw_role: me.raw_role,
        site_id: me.site_id,
        site_name: me.site_name,
        local: me.local,
      };
    }
    if (opportunities?.ok && Array.isArray(opportunities.data)) {
      context.pipeline = opportunities.data
        .slice(0, 25)
        .map((o: any) => ({ title: o.title, stage: o.stage, amount: o.amount, customer: o.customers?.name }));
    }
    if (inventorySummary?.ok && Array.isArray(inventorySummary.products)) {
      const products = inventorySummary.products as any[];
      // crítico: stock total < 10
      const critical = products
        .map((p) => ({
          name: p.name,
          sku: p.sku,
          total: Number(p.total_quantity ?? 0),
        }))
        .filter((p) => p.total < 10)
        .sort((a, b) => a.total - b.total)
        .slice(0, 10);
      if (critical.length) {
        context.inventoryCritical = critical;
      } else {
        context.inventoryCritical = 'sin críticos detectados en el resumen';
      }
    }

    const contextSnippet = JSON.stringify(context).slice(0, 8000);

    const client = new OpenAI({ apiKey });

    const trimmedHistory: HistoryItem[] =
      history.length > 0 ? history.slice(-6) : [];

    const roleHint =
      me?.ok && me.role
        ? `El usuario actual tiene el rol interno "${me.role}"` +
          (me.site_name ? ` y trabaja en la sucursal "${me.site_name}". ` : '. ')
        : 'No conoces el rol ni la sucursal exacta del usuario, responde para un perfil de jefatura o administración. ';

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'Eres Atlas Copilot, analista de negocio de Atlas Suite. ' +
          roleHint +
          'Habla en español, tono amable y conciso. Responde en bullets cortos (3-6). ' +
          'Sé directo: dato → conclusión → siguiente acción. ' +
          'Prioriza impacto alto primero. Ahorra tokens: sin relleno ni repeticiones. ' +
          'Si falta un dato, dilo explícitamente y sugiere qué medir.',
      },
      ...trimmedHistory.map((h) => ({ role: h.role, content: h.content })),
      {
        role: 'user',
        content:
          `Pregunta del usuario (scope: ${scope}):\n` +
          message +
          '\n\n' +
          'Datos recientes del negocio (JSON, resumidos):\n' +
          contextSnippet,
      },
    ];

    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.2,
    });

    const answer = completion.choices[0]?.message?.content ?? '';

    return NextResponse.json({
      ok: true,
      answer,
      scope,
    });
  } catch (error: any) {
    console.error('[ai/chat] error', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'server_error' },
      { status: 500 }
    );
  }
}
