'use client';

import { useMemo, type ReactNode } from 'react';
import useSWR from 'swr';
import {
  Sparkles,
  TrendingUp,
  Target,
  ClipboardList,
  Package,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { demoSalesReport, demoInventory, demoReturnsReport, demoOpportunities } from '@/lib/demo/mockData';

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

type SaleRow = {
  order_id: string;
  order_date: string;
  subtotal: number;
  quantity: number;
  channel?: string;
  branch?: string;
  product_name: string;
  seller_full_name?: string;
};

type OverviewAgg = { revenue: number; tickets: number; units: number };

type OverviewResponse = {
  ok: boolean;
  today: OverviewAgg;
  week: OverviewAgg;
  month: OverviewAgg;
  returnsToday: { count: number; amount: number };
  attendanceToday: { marks: number; people: number };
};

type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  reorderPoint?: number;
  rotationDays?: number;
  branch?: string;
};

type Metric = { revenue: number; units: number; tickets: number };

type Snapshot = {
  today: Metric;
  yesterday: Metric;
  week: Metric;
  prevWeek: Metric;
  month: Metric;
};

type StatsSnapshot = {
  today: OverviewAgg;
  week: OverviewAgg;
  month: OverviewAgg;
  returnsToday: { count: number; amount: number };
  attendance: { marks: number; people: number };
  dayDelta: number;
  weekDelta: number;
  yesterday: Metric;
};

type ReturnRecord = {
  return_date?: string;
  return_amount?: number;
  reason?: string;
  branch?: string;
  seller_name?: string;
};

type ReturnsInsights = {
  todayAmount: number;
  todayCount: number;
  topReasons: { reason: string; count: number }[];
  recent: ReturnRecord[];
};

type OpportunityRow = {
  title?: string | null;
  stage?: string | null;
  amount?: number | null;
  close_date?: string | null;
  customers?: { name?: string | null } | null;
  created_at?: string;
};

type PipelineMetrics = {
  totalAmount: number;
  closingSoonAmount: number;
  closingSoonDeals: OpportunityRow[];
  stalledCount: number;
  topDeals: OpportunityRow[];
};

type Alert = {
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  action?: string;
};

export default function AnalisisPage() {
  const { data: overview } = useSWR<OverviewResponse>('/endpoints/metrics/overview', fetcher, {
    onError: () => undefined,
  });
  const { data: salesReport } = useSWR<SaleRow[]>('/endpoints/sales-report', fetcher, {
    onError: () => undefined,
  });
  const { data: inventorySummary } = useSWR<any>('/endpoints/inventory/summary', fetcher, {
    onError: () => undefined,
  });
  const { data: returnsReport } = useSWR<any[]>('/endpoints/returns-report', fetcher, {
    onError: () => undefined,
  });
  const { data: opportunities } = useSWR<any>('/endpoints/opportunities', fetcher, {
    onError: () => undefined,
  });

  const salesDataset = useMemo(
    () => (Array.isArray(salesReport) && salesReport.length ? salesReport : demoSalesReport),
    [salesReport]
  );

  const inventoryDataset: InventoryItem[] = useMemo(() => {
    if (inventorySummary?.ok && Array.isArray(inventorySummary.products) && inventorySummary.products.length) {
      return inventorySummary.products.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: Number(p.total_quantity ?? 0),
        reorderPoint: 8,
        branch: p.stock?.[0]?.site_name ?? 'Principal',
      }));
    }
    return demoInventory.products.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: Number(p.stock ?? 0),
      reorderPoint: p.reorderPoint ?? 10,
      rotationDays: p.rotationDays,
      branch: p.branch,
    }));
  }, [inventorySummary]);

  const returnsDataset = useMemo(() => {
    if (Array.isArray(returnsReport) && returnsReport.length) return returnsReport;
    return demoReturnsReport;
  }, [returnsReport]);

  const pipelineDataset = useMemo(() => {
    if (opportunities?.ok && Array.isArray(opportunities.data) && opportunities.data.length) {
      return opportunities.data;
    }
    if (Array.isArray(opportunities) && opportunities.length) {
      return opportunities;
    }
    return demoOpportunities;
  }, [opportunities]);

  const localSnapshot = useMemo(() => summarizeSales(salesDataset), [salesDataset]);

  const stats = useMemo<StatsSnapshot>(() => {
    const today = overview?.ok ? overview.today : localSnapshot.today;
    const week = overview?.ok ? overview.week : localSnapshot.week;
    const month = overview?.ok ? overview.month : localSnapshot.month;
    const returnsToday = overview?.returnsToday ?? { count: 0, amount: 0 };
    const attendance = overview?.attendanceToday ?? { marks: 0, people: 0 };
    const dayDelta = percentChange(localSnapshot.today.revenue, localSnapshot.yesterday.revenue);
    const weekDelta = percentChange(localSnapshot.week.revenue, localSnapshot.prevWeek.revenue);
    return { today, week, month, returnsToday, attendance, dayDelta, weekDelta, yesterday: localSnapshot.yesterday };
  }, [overview, localSnapshot]);

  const channelMix = useMemo(() => buildChannelMix(salesDataset), [salesDataset]);
  const branchMix = useMemo(() => buildBranchMix(salesDataset), [salesDataset]);
  const sellerLeaders = useMemo(() => buildSellerLeaderboard(salesDataset), [salesDataset]);
  const topProducts = useMemo(() => buildTopProducts(salesDataset), [salesDataset]);
  const lowStock = useMemo(() => buildLowStock(inventoryDataset), [inventoryDataset]);
  const returnsInsights = useMemo(() => analyzeReturns(returnsDataset), [returnsDataset]);
  const pipelineStats = useMemo(() => buildPipelineMetrics(pipelineDataset), [pipelineDataset]);

  const topChannel = channelMix[0];
  const topBranch = branchMix[0];
  const topSeller = sellerLeaders[0];

  const insightCards = useMemo(
    () =>
      buildInsights({
        stats,
        topChannel,
        topBranch,
        lowStock,
        topProducts,
        pipeline: pipelineStats,
        returnsInsights,
      }),
    [stats, topChannel, topBranch, lowStock, topProducts, pipelineStats, returnsInsights]
  );

  const actionPlans = useMemo(
    () =>
      buildActionPlans({
        stats,
        topChannel,
        topSeller,
        lowStock,
        pipeline: pipelineStats,
        returnsInsights,
      }),
    [stats, topChannel, topSeller, lowStock, pipelineStats, returnsInsights]
  );

  const alerts = useMemo(
    () => buildAlerts({ stats, returnsInsights, lowStock, pipeline: pipelineStats }),
    [stats, returnsInsights, lowStock, pipelineStats]
  );

  return (
    <div className="space-y-8">
      <section className="glass-card relative overflow-hidden p-5 lg:p-7">
        <div className="absolute inset-0 bg-gradient-to-r from-apple-blue-500/25 via-transparent to-apple-green-500/25 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-apple-gray-100">
                <Sparkles size={14} />
                <span>Copilot Analyst</span>
              </div>
              <h1 className="apple-h1 text-white mt-3">Análisis IA en tiempo real</h1>
              <p className="apple-body text-apple-gray-300 max-w-3xl">
                Atlas Copilot interpreta ventas, inventario y caja directamente desde Supabase para sugerir acciones y planes
                tácticos listos para ejecutar.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard
              label="Ingresos hoy"
              value={money(stats.today.revenue)}
              helper={`${stats.today.tickets} tickets · ${stats.today.units} uds`}
              trend={stats.dayDelta}
            />
            <KpiCard
              label="Semana en curso"
              value={money(stats.week.revenue)}
              helper={`Vs semana previa: ${money(localSnapshot.prevWeek.revenue)}`}
              trend={stats.weekDelta}
            />
            <KpiCard
              label="Mes acumulado"
              value={money(stats.month.revenue)}
              helper={`${stats.month.units} uds totales`}
            />
            <KpiCard
              label="Devoluciones hoy"
              value={money(stats.returnsToday.amount)}
              helper={`${stats.returnsToday.count} casos reportados`}
              tone="orange"
            />
          </div>
        </div>
      </section>

      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      <section className="grid gap-4 lg:grid-cols-3">
        {insightCards.map((card) => (
          <InsightCard key={card.title} {...card} />
        ))}
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Target size={18} className="text-apple-green-300" />
          <h2 className="apple-h3 text-white">Planes de acción recomendados</h2>
          <p className="apple-caption text-apple-gray-400">Basados en señales de ventas, inventario y caja.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {actionPlans.map((plan) => (
            <ActionPlanCard key={plan.title} {...plan} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-apple-blue-300" />
            <h2 className="apple-h3 text-white">Resumen operativo</h2>
          </div>
          <ul className="space-y-3 text-sm text-apple-gray-200">
            <li>
              <span className="text-white font-semibold">Top canal:</span>{' '}
              {topChannel ? `${topChannel.channel} · ${money(topChannel.value)} (${topChannel.share}% del revenue filtrado)` : 'Sin datos'}
            </li>
            <li>
              <span className="text-white font-semibold">Sucursal líder:</span>{' '}
              {topBranch ? `${topBranch.branch} · ${money(topBranch.value)}` : 'Sin datos'}
            </li>
            <li>
              <span className="text-white font-semibold">Asistencias registradas hoy:</span>{' '}
              {stats.attendance.people} personas · {stats.attendance.marks} marcas
            </li>
            <li>
              <span className="text-white font-semibold">Productos con riesgo:</span>{' '}
              {lowStock.length
                ? lowStock
                    .slice(0, 3)
                    .map((p) => `${p.name} (${p.stock} uds)`)
                    .join(', ')
                : 'Inventario estable'}
            </li>
            <li>
              <span className="text-white font-semibold">Top productos:</span>{' '}
              {topProducts
                .slice(0, 2)
                .map((p) => `${p.name} (${money(p.revenue)})`)
                .join(', ')}
            </li>
            <li>
              <span className="text-white font-semibold">Pipeline activo:</span>{' '}
              {pipelineStats.totalAmount ? `${money(pipelineStats.totalAmount)} · ${pipelineStats.topDeals[0]?.stage || 'Sin etapa'}` : 'Sin oportunidades'}
            </li>
            <li>
              <span className="text-white font-semibold">Motivos de devolución:</span>{' '}
              {returnsInsights.topReasons.length
                ? returnsInsights.topReasons.map((r) => `${r.reason} (${r.count})`).join(', ')
                : 'Sin devoluciones recientes'}
            </li>
          </ul>
        </div>
        <ChatPanel />
      </section>
    </div>
  );
}

function money(n: number) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 0,
  }).format(n || 0);
}

function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / Math.max(previous, 1)) * 100;
}

function analyzeReturns(rows: ReturnRecord[]): ReturnsInsights {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRows = rows.filter((row) => (row.return_date || '').startsWith(todayKey));
  const todayAmount = todayRows.reduce((sum, row) => sum + Number(row.return_amount ?? 0), 0);
  const reasonMap = new Map<string, number>();
  rows.slice(0, 25).forEach((row) => {
    const reason = row.reason || 'Sin motivo';
    reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
  });
  const topReasons = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return {
    todayAmount,
    todayCount: todayRows.length,
    topReasons,
    recent: rows.slice(0, 4),
  };
}

function buildPipelineMetrics(rows: OpportunityRow[]): PipelineMetrics {
  const deals = Array.isArray(rows) ? rows : [];
  const sorted = [...deals].sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0));
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const closingSoonDeals = deals
    .filter((deal) => {
      if (!deal.close_date) return false;
      const closeDate = new Date(deal.close_date);
      return closeDate >= now && closeDate <= soon;
    })
    .sort((a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0));
  const closingSoonAmount = closingSoonDeals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);
  const stalledCount = deals.filter((deal) => {
    const stage = (deal.stage || '').toUpperCase();
    const created = deal.created_at ? new Date(deal.created_at) : null;
    if (!created) return false;
    const daysOpen = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysOpen > 14 && ['LEAD', 'CONTACTO', 'CALIFICADO'].includes(stage);
  }).length;
  const totalAmount = deals.reduce((sum, deal) => sum + Number(deal.amount ?? 0), 0);
  return {
    totalAmount,
    closingSoonAmount,
    closingSoonDeals: closingSoonDeals.slice(0, 4),
    stalledCount,
    topDeals: sorted.slice(0, 5),
  };
}

function buildAlerts({
  stats,
  returnsInsights,
  lowStock,
  pipeline,
}: {
  stats: StatsSnapshot;
  returnsInsights: ReturnsInsights;
  lowStock: InventoryItem[];
  pipeline: PipelineMetrics;
}): Alert[] {
  const alerts: Alert[] = [];

  if (stats.dayDelta < -5) {
    alerts.push({
      level: 'critical',
      title: 'Ingresos cayendo',
      detail: `Hoy -${Math.abs(stats.dayDelta).toFixed(1)}% vs ayer. Revisa canales y pricing de inmediato.`,
      action: 'Reasigna al mejor equipo en el canal líder y comunica promos flash.',
    });
  }

  if (stats.weekDelta < -10) {
    alerts.push({
      level: 'warning',
      title: 'Semana debajo del objetivo',
      detail: `La semana corre ${stats.weekDelta.toFixed(1)}% por debajo de la anterior.`,
      action: 'Ajusta metas diarias y revisa pipeline para compensar.',
    });
  }

  const returnRatio = stats.today.revenue ? stats.returnsToday.amount / Math.max(stats.today.revenue, 1) : 0;
  if (returnRatio > 0.08 || returnsInsights.todayCount >= 3) {
    alerts.push({
      level: 'critical',
      title: 'Devoluciones elevadas',
      detail: `${returnsInsights.todayCount} casos · ${money(stats.returnsToday.amount)} (${(returnRatio * 100).toFixed(1)}% del día).`,
      action: `Motivo top: ${returnsInsights.topReasons[0]?.reason || 'Sin dato'}. Escala al equipo de calidad.`,
    });
  }

  if (lowStock.length >= 3) {
    alerts.push({
      level: 'warning',
      title: 'Stock crítico',
      detail: `${lowStock.slice(0, 3).map((p) => p.name).join(', ')} bajos en inventario.`,
      action: 'Coordina traslado o compra hoy para no frenar ventas.',
    });
  }

  if (!pipeline.closingSoonDeals.length && pipeline.totalAmount > 0) {
    alerts.push({
      level: 'info',
      title: 'Pipeline sin cierres inmediatos',
      detail: 'No hay deals con cierre <7 días. Revisa seguimiento y compromiso de clientes.',
      action: 'Agenda llamadas con top 5 oportunidades y actualiza fechas en CRM.',
    });
  }

  return alerts;
}

function summarizeSales(rows: SaleRow[]): Snapshot {
  const map = new Map<string, Metric>();
  rows.forEach((row) => {
    if (!row.order_date) return;
    const day = row.order_date.slice(0, 10);
    const bucket = map.get(day) ?? { revenue: 0, units: 0, tickets: 0 };
    bucket.revenue += Number(row.subtotal ?? 0);
    bucket.units += Number(row.quantity ?? 0);
    bucket.tickets += 1;
    map.set(day, bucket);
  });
  const orderedKeys = Array.from(map.keys()).sort();
  const zero: Metric = { revenue: 0, units: 0, tickets: 0 };
  if (!orderedKeys.length) {
    return { today: zero, yesterday: zero, week: zero, prevWeek: zero, month: zero };
  }
  const todayKey = orderedKeys[orderedKeys.length - 1];
  const yesterdayKey = orderedKeys[orderedKeys.length - 2] ?? todayKey;
  const last7 = orderedKeys.slice(-7);
  const prev7 = orderedKeys.slice(-14, -7);
  const last30 = orderedKeys.slice(-30);
  const sum = (keys: string[]) =>
    keys.reduce(
      (acc, key) => {
        const bucket = map.get(key);
        if (!bucket) return acc;
        return {
          revenue: acc.revenue + bucket.revenue,
          units: acc.units + bucket.units,
          tickets: acc.tickets + bucket.tickets,
        };
      },
      { revenue: 0, units: 0, tickets: 0 }
    );
  return {
    today: map.get(todayKey) ?? zero,
    yesterday: map.get(yesterdayKey) ?? zero,
    week: sum(last7),
    prevWeek: sum(prev7),
    month: sum(last30.length ? last30 : orderedKeys),
  };
}

function buildChannelMix(rows: SaleRow[]) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const channel = row.channel || 'Sin canal';
    map.set(channel, (map.get(channel) ?? 0) + Number(row.subtotal ?? 0));
  });
  const total = Array.from(map.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(map.entries())
    .map(([channel, value]) => ({
      channel,
      value,
      share: total ? Number(((value / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildBranchMix(rows: SaleRow[]) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const branch = row.branch || 'Sin sucursal';
    map.set(branch, (map.get(branch) ?? 0) + Number(row.subtotal ?? 0));
  });
  return Array.from(map.entries())
    .map(([branch, value]) => ({ branch, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function buildSellerLeaderboard(rows: SaleRow[]) {
  const map = new Map<string, { revenue: number; tickets: number }>();
  rows.forEach((row) => {
    const seller = row.seller_full_name || 'Sin asignar';
    const current = map.get(seller) ?? { revenue: 0, tickets: 0 };
    current.revenue += Number(row.subtotal ?? 0);
    current.tickets += 1;
    map.set(seller, current);
  });
  return Array.from(map.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function buildTopProducts(rows: SaleRow[]) {
  const map = new Map<string, { revenue: number; units: number }>();
  rows.forEach((row) => {
    const product = row.product_name || 'Sin nombre';
    const current = map.get(product) ?? { revenue: 0, units: 0 };
    current.revenue += Number(row.subtotal ?? 0);
    current.units += Number(row.quantity ?? 0);
    map.set(product, current);
  });
  return Array.from(map.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function buildLowStock(items: InventoryItem[]) {
  return items
    .map((item) => ({
      ...item,
      coverage: item.rotationDays ? Math.max(1, Math.round(item.rotationDays / 7)) : null,
    }))
    .filter((item) => (item.stock ?? 0) <= (item.reorderPoint ?? 8))
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 4);
}

function buildInsights({
  stats,
  topChannel,
  topBranch,
  lowStock,
  topProducts,
  pipeline,
  returnsInsights,
}: {
  stats: StatsSnapshot;
  topChannel?: { channel: string; value: number; share: number };
  topBranch?: { branch: string; value: number };
  lowStock: InventoryItem[];
  topProducts: { name: string; revenue: number; units: number }[];
  pipeline: PipelineMetrics;
  returnsInsights: ReturnsInsights;
}) {
  const insights = [
    {
      title: 'Momentum de ingresos',
      icon: <TrendingUp size={18} className="text-apple-green-300" />,
      headline: money(stats.today.revenue),
      badge: `${stats.dayDelta >= 0 ? '+' : ''}${stats.dayDelta.toFixed(1)}% vs ayer`,
      body: `Semana acumula ${money(stats.week.revenue)} (${stats.weekDelta >= 0 ? '+' : ''}${stats.weekDelta.toFixed(1)}% vs semana pasada). Ticket promedio: ${money(
        stats.today.tickets ? stats.today.revenue / stats.today.tickets : 0
      )}.`,
      highlights: [
        `${stats.today.tickets} tickets hoy`,
        `${stats.month.units} uds en el mes`,
      ],
    },
    {
      title: 'Enfoque comercial',
      icon: <Activity size={18} className="text-apple-blue-300" />,
      headline: topChannel ? topChannel.channel : 'Sin canal líder',
      badge: topChannel ? `${topChannel.share}% del revenue` : '—',
      body: topChannel
        ? `${money(topChannel.value)} generados. Asigna a ${stats.today.tickets > 0 ? 'asesores senior' : 'tu mejor equipo'} para seguir este canal.`
        : 'Aún no hay datos recientes, registra ventas para ver tendencias.',
      highlights: topProducts.slice(0, 2).map((p) => `${p.name}: ${money(p.revenue)}`),
    },
    {
      title: 'Pipeline y forecast',
      icon: <Target size={18} className="text-apple-green-300" />,
      headline: pipeline.totalAmount ? money(pipeline.totalAmount) : 'Sin oportunidades activas',
      badge:
        pipeline.closingSoonDeals.length > 0
          ? `${pipeline.closingSoonDeals.length} cierres <7 días`
          : pipeline.stalledCount > 0
          ? `${pipeline.stalledCount} estancadas`
          : undefined,
      body:
        pipeline.closingSoonAmount > 0
          ? `${money(pipeline.closingSoonAmount)} listos para cerrar. Empuja follow-ups y coordina disponibilidad.`
          : 'Añade oportunidades o sincroniza con CRM para ver el forecast.',
      highlights: pipeline.topDeals.length
        ? pipeline.topDeals.slice(0, 3).map((deal) => `${deal.title || 'Oportunidad'} · ${money(Number(deal.amount ?? 0))}`)
        : ['Sin deals priorizados'],
    },
    {
      title: 'Salud de inventario',
      icon: <Package size={18} className="text-apple-orange-300" />,
      headline: lowStock.length ? `${lowStock.length} productos críticos` : 'Inventario estable',
      badge: lowStock.length ? 'Atiende hoy' : 'Sin alertas',
      body: lowStock.length
        ? `Reponer ${lowStock
            .slice(0, 2)
            .map((p) => `${p.name} (${p.stock} uds)`)
            .join(', ')} y comunica a operaciones.`
        : 'Rotación sana: no hay referencias bajo el punto de pedido.',
      highlights: lowStock.length
        ? lowStock.map((p) => `${p.branch || 'Principal'} · ${p.stock} uds`)
        : ['Sigue monitoreando con Copilot IA'],
    },
    {
      title: 'Calidad de ventas',
      icon: <ClipboardList size={18} className="text-apple-blue-300" />,
      headline: `${returnsInsights.todayCount} devoluciones hoy`,
      badge: returnsInsights.todayAmount ? money(returnsInsights.todayAmount) : undefined,
      body:
        returnsInsights.todayCount > 0
          ? `Motivo principal: ${returnsInsights.topReasons[0]?.reason || 'Sin motivo claro'}. Validar procesos antes del cierre de caja.`
          : 'Sin devoluciones registradas hoy. Mantén controles activos.',
      highlights: returnsInsights.recent.slice(0, 2).map((ret) => `${ret.branch || 'Sucursal'} · ${ret.reason}`),
    },
  ];

  if (topBranch) {
    insights.push({
      title: 'Sucursal líder',
      icon: <Target size={18} className="text-apple-green-400" />,
      headline: topBranch.branch,
      badge: money(topBranch.value),
      body: 'Alinea playbooks y campañas desde la sucursal con mejor momentum para contagiar al resto.',
      highlights: [
        `${branchMixLabel(topBranch.branch)} es el punto más caliente`,
        'Comparte aprendizajes en el canal de operaciones',
      ],
    });
  }

  return insights;
}

function branchMixLabel(branch: string) {
  return branch === 'Sin sucursal' ? 'Operación sin asignar' : branch;
}

function buildActionPlans({
  stats,
  topChannel,
  topSeller,
  lowStock,
  pipeline,
  returnsInsights,
}: {
  stats: StatsSnapshot;
  topChannel?: { channel: string; value: number; share: number };
  topSeller?: { name: string };
  lowStock: InventoryItem[];
  pipeline: PipelineMetrics;
  returnsInsights: ReturnsInsights;
}) {
  const plans = [] as {
    title: string;
    description: string;
    owner: string;
    steps: string[];
  }[];

  if (topChannel) {
    plans.push({
      title: `Impulsar ${topChannel.channel}`,
      description: `${money(topChannel.value)} (${topChannel.share}% del día). Multiplica el script ganador y responde leads en <30 min.`,
      owner: 'Ventas',
      steps: [
        `Asignar a ${topSeller?.name || 'asesores senior'} el seguimiento de los próximos 20 leads.`,
        'Replicar el mensaje y oferta en WhatsApp/IG y medir conversión cada 2h.',
        'Registrar aprendizajes en Copilot para que el bot los use al responder.',
      ],
    });
  }

  if (lowStock.length) {
    const risky = lowStock
      .slice(0, 3)
      .map((p) => `${p.name} (${p.stock} uds)`)
      .join(', ');
    plans.push({
      title: 'Plan reabastecimiento express',
      description: `Stock crítico detectado: ${risky}. Necesitas cubrir al menos 10 días de ventas.`,
      owner: 'Operaciones',
      steps: [
        'Confirmar inventario físico y reservar unidades para preventas comprometidas.',
        'Programar traslado o compra urgente antes del cierre de hoy.',
        'Actualizar inventario/ERP para que Copilot evite prometer stock inexistente.',
      ],
    });
  }

  plans.push({
    title: 'Control de devoluciones y caja',
    description: `${stats.returnsToday.count} devoluciones hoy (${money(stats.returnsToday.amount)}). Asegura que se registren y compensen antes del corte.`,
    owner: 'Cajas',
    steps: [
      'Revisar tickets con diferencias y dejar nota en el módulo de caja.',
      `Avisar a finanzas si supera el 3% del ingreso diario (motivo top: ${returnsInsights.topReasons[0]?.reason || 'sin dato'})`,
      'Confirmar que cada devolución actualiza stock y CRM.',
    ],
  });

  if (pipeline.closingSoonDeals.length || pipeline.stalledCount) {
    plans.push({
      title: 'Pipeline al día',
      description: pipeline.closingSoonDeals.length
        ? `${pipeline.closingSoonDeals.length} deals cierran en <7 días (${money(pipeline.closingSoonAmount)}).`
        : 'Varias oportunidades están estancadas, reactiva seguimiento.',
      owner: 'Ventas B2B',
      steps: [
        pipeline.closingSoonDeals[0]
          ? `Agendar llamadas con ${pipeline.closingSoonDeals.slice(0, 2).map((d) => d.customers?.name || d.title).join(', ')}`
          : 'Identificar oportunidades sin actividad en los últimos 10 días.',
        'Actualizar probabilidad y fecha de cierre en CRM para tener forecast real.',
        'Compartir necesidades de inventario/caja para asegurar fulfillment.',
      ],
    });
  }

  return plans;
}

function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const palette: Record<Alert['level'], string> = {
    critical: 'border-apple-red-500/40 bg-apple-red-500/10 text-apple-red-50',
    warning: 'border-apple-orange-500/40 bg-apple-orange-500/10 text-apple-orange-50',
    info: 'border-apple-blue-500/30 bg-apple-blue-500/10 text-apple-blue-50',
  };
  return (
    <section className="glass-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-apple-red-300" />
        <h2 className="apple-h3 text-white">Alertas prioritarias</h2>
        <span className="pill pill-blue text-xs">{alerts.length}</span>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div key={`${alert.title}-${idx}`} className={`rounded-apple border px-3 py-3 ${palette[alert.level]}`}>
            <div className="font-semibold text-white">{alert.title}</div>
            <p className="apple-caption text-white/80">{alert.detail}</p>
            {alert.action && <p className="apple-caption text-white/70 mt-1">{alert.action}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  helper,
  trend,
  tone = 'blue',
}: {
  label: string;
  value: string;
  helper?: string;
  trend?: number;
  tone?: 'blue' | 'green' | 'orange';
}) {
  const palette: Record<typeof tone, string> = {
    blue: 'from-apple-blue-500/20 via-apple-blue-600/10 to-apple-blue-900/40 border-apple-blue-500/40',
    green: 'from-apple-green-500/20 via-apple-green-600/10 to-apple-green-900/40 border-apple-green-500/40',
    orange: 'from-apple-orange-500/20 via-apple-orange-600/10 to-apple-orange-900/40 border-apple-orange-500/40',
  };
  const trendLabel = typeof trend === 'number' ? `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%` : null;
  return (
    <div className="glass-card p-4 border bg-white/5 relative overflow-hidden">
      <div className={`pointer-events-none absolute inset-px rounded-[10px] bg-gradient-to-br ${palette[tone]}`} />
      <div className="relative z-10 space-y-1">
        <p className="apple-caption text-apple-gray-300">{label}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
        {helper && <p className="apple-caption text-apple-gray-500">{helper}</p>}
        {trendLabel && <p className="apple-caption text-apple-gray-400">{trendLabel}</p>}
      </div>
    </div>
  );
}

function InsightCard({
  title,
  icon,
  headline,
  badge,
  body,
  highlights,
}: {
  title: string;
  icon: ReactNode;
  headline: string;
  badge?: string;
  body: string;
  highlights: string[];
}) {
  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-white">
        {icon}
        <h3 className="apple-h4">{title}</h3>
        {badge && <span className="pill pill-blue text-xs">{badge}</span>}
      </div>
      <p className="text-2xl font-semibold text-white">{headline}</p>
      <p className="apple-body text-apple-gray-300">{body}</p>
      <ul className="list-disc list-inside text-apple-gray-400 text-sm space-y-1">
        {highlights.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ActionPlanCard({
  title,
  description,
  owner,
  steps,
}: {
  title: string;
  description: string;
  owner: string;
  steps: string[];
}) {
  return (
    <div className="rounded-apple border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{title}</h3>
          <p className="apple-caption text-apple-gray-400">{description}</p>
        </div>
        <span className="pill bg-white/10 text-apple-gray-200 text-xs">{owner}</span>
      </div>
      <ol className="list-decimal list-inside text-sm text-apple-gray-200 space-y-1">
        {steps.map((step, idx) => (
          <li key={idx}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
