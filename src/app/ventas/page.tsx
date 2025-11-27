'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Filter, DollarSign, ShoppingBag, Package, BarChart3, Download, Sparkles, TrendingUp, Trophy, MapPin } from 'lucide-react';
import { demoSalesReport, demoSalesSummary } from '@/lib/demo/mockData';

const fetcher = async (u: string) => {
  const res = await fetch(u, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

type SaleRow = {
  order_id: string;
  order_no: number | null;
  order_date: string;
  branch: string | null;
  seller_full_name: string | null;
  product_name: string;
  quantity: number;
  subtotal: number;
  channel?: string;
};

type InsightCardData = {
  title: string;
  stat: string;
  helper: string;
  description: string;
  tone: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
};

const CHANNEL_COLORS = ['#38bdf8', '#34d399', '#f97316', '#a855f7'];
const BRANCH_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'];

export default function VentasPage() {
  const { data: salesReport } = useSWR<SaleRow[]>('/endpoints/sales-report', fetcher, {
    onError: () => undefined,
  });
  const { data: salesSummary } = useSWR<any[]>('/endpoints/sales-summary', fetcher, {
    onError: () => undefined,
  });

  const dataset = useMemo(
    () => (Array.isArray(salesReport) && salesReport.length ? salesReport : demoSalesReport),
    [salesReport]
  );
  const [filters, setFilters] = useState<{ channel: string; branch: string }>({
    channel: 'ALL',
    branch: 'ALL',
  });
  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month'>('month');

  const channelOptions = useMemo(() => {
    const set = new Set<string>();
    dataset.forEach((row) => row.channel && set.add(row.channel));
    return Array.from(set);
  }, [dataset]);

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    dataset.forEach((row) => row.branch && set.add(row.branch));
    return Array.from(set);
  }, [dataset]);

  const activeDataset = useMemo(() => {
    return dataset.filter((row) => {
      const matchChannel = filters.channel === 'ALL' || row.channel === filters.channel;
      const matchBranch = filters.branch === 'ALL' || row.branch === filters.branch;
      return matchChannel && matchBranch;
    });
  }, [dataset, filters]);

  const filteredDataset = useMemo(
    () => filterByPeriod(activeDataset, periodFilter),
    [activeDataset, periodFilter]
  );

  const latestRows = useMemo(() => filteredDataset.slice(0, 25), [filteredDataset]);
  const resumen =
    salesSummary && Array.isArray(salesSummary) && salesSummary.length ? salesSummary : demoSalesSummary;

  const totals = useMemo(() => {
    return filteredDataset.reduce(
      (acc, row) => {
        acc.revenue += Number(row.subtotal ?? 0);
        acc.units += Number(row.quantity ?? 0);
        acc.tickets += 1;
        return acc;
      },
      { revenue: 0, units: 0, tickets: 0 }
    );
  }, [filteredDataset]);

  const performance = useMemo(() => buildPerformanceSeries(filteredDataset), [filteredDataset]);
  const branchMix = useMemo(() => buildBranchMix(filteredDataset), [filteredDataset]);
  const channelMix = useMemo(() => buildChannelMix(filteredDataset), [filteredDataset]);
  const topProducts = useMemo(() => buildTopProducts(filteredDataset), [filteredDataset]);
  const sellerLeaderboard = useMemo(() => buildSellerLeaderboard(filteredDataset), [filteredDataset]);

  const avgTicket = totals.tickets ? totals.revenue / Math.max(totals.tickets, 1) : 0;
  const topChannel = channelMix[0];
  const topBranch = branchMix[0];
  const branchTotal = branchMix.reduce((sum, item) => sum + item.value, 0);
  const branchShare = topBranch && branchTotal ? Math.round((topBranch.value / branchTotal) * 100) : 0;
  const topSeller = sellerLeaderboard[0];
  const periodDescriptor = periodFilter === 'day' ? 'Últimas 24 horas' : periodFilter === 'week' ? 'Últimos 7 días' : 'Últimos 30 días';
  const heroStats = [
    {
      label: 'Ingresos 30 días',
      value: money(performance.last30Total),
      helper: 'Rolling 30 días',
    },
    {
      label: 'Ticket promedio',
      value: money(avgTicket),
      helper: `${totals.tickets} tickets · ${periodDescriptor.toLowerCase()}`,
    },
    {
      label: 'Sucursales activas',
      value: branchMix.length ? branchMix.length.toString() : '—',
      helper: topBranch ? `${topBranch.branch} lidera` : 'Sin datos',
    },
  ];

  const insights = useMemo<InsightCardData[]>(() => {
    const cards: InsightCardData[] = [
      {
        title: 'Momentum de ingresos',
        stat: `${performance.trend >= 0 ? '+' : ''}${performance.trend.toFixed(1)}%`,
        helper: 'vs periodo anterior',
        description: `El periodo analizado generó ${money(performance.last30Total)} durante los últimos 30 días.`,
        tone: performance.trend >= 0 ? 'positive' : 'negative',
        icon: <TrendingUp size={16} />,
      },
    ];

    if (topBranch) {
      cards.push({
        title: 'Sucursal líder',
        stat: topBranch.branch,
        helper: money(topBranch.value),
        description: branchShare ? `Aporta ${branchShare}% del revenue filtrado.` : 'Aporta la mayor proporción del periodo seleccionado.',
        tone: 'neutral',
        icon: <MapPin size={16} />,
      });
    }

    if (topSeller) {
      cards.push({
        title: 'Vendedor top',
        stat: topSeller.name,
        helper: money(topSeller.revenue),
        description: `${topSeller.tickets} tickets cerrados en el periodo.`,
        tone: 'positive',
        icon: <Trophy size={16} />,
      });
    }

    return cards;
  }, [branchShare, performance.last30Total, performance.trend, topBranch, topSeller]);

  const handleExport = () => {
    const header = ['Fecha', 'Sucursal', 'Vendedor', 'Producto', 'Cantidad', 'Monto', 'Canal'];
    const lines = filteredDataset.map((row) => {
      const values = [
        row.order_date ? format(new Date(row.order_date), 'yyyy-MM-dd') : '',
        row.branch || 'Sin sucursal',
        row.seller_full_name || 'Sin asignar',
        row.product_name,
        String(row.quantity ?? 0),
        String(row.subtotal ?? 0),
        row.channel || 'Mixto',
      ];
      return values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventas-${periodFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="glass-card relative overflow-hidden p-5 lg:p-7">
        <div className="absolute inset-0 bg-gradient-to-r from-apple-blue-600/30 via-transparent to-apple-green-500/20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-apple-gray-100">
                <Sparkles size={14} />
                <span>Revenue desk</span>
              </div>
              <h1 className="apple-h1 text-white mt-3">Ventas & Revenue Intelligence</h1>
              <p className="apple-body text-apple-gray-200 max-w-3xl">
                Hero ejecutivo con acciones rápidas, perspectivas en vivo y patrones listos para accionar, sin depender de
                herramientas externas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary btn-sm" onClick={handleExport}>
                <Download size={16} />
                Exportar CSV
              </button>
            <button className="btn-primary btn-sm" onClick={() => (window.location.href = '/ventas/registro')}>
              Registrar venta
            </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <HeroStat key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-apple-gray-300">
            <Filter size={12} />
            Vista ventas
          </div>
          <p className="apple-caption text-apple-gray-400">{filteredDataset.length} registros · {periodDescriptor}</p>
          <div className="flex gap-2 ml-auto">
            <button className="btn-ghost btn-xs" onClick={() => setFilters({ channel: 'ALL', branch: 'ALL' })}>
              Limpiar filtros
            </button>
            <button className="btn-secondary btn-xs" onClick={() => (window.location.href = '/ventas/registro')}>
              + Venta rápida
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Canal"
            value={filters.channel}
            options={['ALL', ...channelOptions]}
            onChange={(value) => setFilters((prev) => ({ ...prev, channel: value }))}
          />
          <FilterSelect
            label="Sucursal"
            value={filters.branch}
            options={['ALL', ...branchOptions]}
            onChange={(value) => setFilters((prev) => ({ ...prev, branch: value }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="apple-caption text-apple-gray-400">Periodo:</span>
          <div className="inline-flex rounded-apple border border-white/10 bg-white/5 p-1">
            {(['day', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setPeriodFilter(period)}
                className={`px-3 py-1.5 text-sm font-medium rounded-[10px] transition ${
                  periodFilter === period ? 'bg-white/25 text-white shadow-apple-sm' : 'text-apple-gray-400 hover:text-white'
                }`}
              >
                {period === 'day' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={<DollarSign size={18} />}
          label="Total vendido"
          value={money(totals.revenue)}
          sub={filters.channel === 'ALL' ? 'Todos los canales' : filters.channel}
        />
        <MetricTile
          icon={<ShoppingBag size={18} />}
          label="Tickets"
          value={totals.tickets}
          sub={`Promedio ${money(totals.tickets ? totals.revenue / Math.max(totals.tickets, 1) : 0)}`}
          tone="green"
        />
        <MetricTile
          icon={<Package size={18} />}
          label="Productos vendidos"
          value={totals.units}
          sub="Unidades filtradas"
          tone="orange"
        />
        <MetricTile
          icon={<BarChart3 size={18} />}
          label="Canal líder"
          value={topChannel ? topChannel.channel : 'Sin datos'}
          sub={topChannel ? `${money(topChannel.value)} · ${topChannel.share}%` : '—'}
          tone="purple"
        />
      </section>

      {insights.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((insight, index) => (
            <InsightCard key={`${insight.title}-${index}`} {...insight} />
          ))}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="glass-card p-4 sm:p-6 xl:col-span-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="apple-h3 text-white">Tendencia de ingresos</h2>
              <p className="apple-caption text-apple-gray-400">Periodo seleccionado · {money(performance.last30Total)}</p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
              performance.trend >= 0 ? 'bg-apple-green-500/10 text-apple-green-300' : 'bg-apple-red-500/10 text-apple-red-300'
            }`}>
              <TrendingUp size={14} />
              {performance.trend >= 0 ? '+' : ''}
              {performance.trend.toFixed(1)}% vs periodo anterior
            </div>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performance.series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis
                  stroke="rgba(255,255,255,0.6)"
                  fontSize={12}
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                  formatter={(value: any) => [`${money(Number(value))}`, 'Ingresos']}
                  labelFormatter={(label) => `Fecha ${label}`}
                />
                <Area type="monotone" dataKey="revenue" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">Volumen de unidades</h3>
                <p className="apple-caption text-apple-gray-400">
                  {performance.last30Units.toLocaleString('es-BO')} uds · rolling 30 días
                </p>
              </div>
              <span className="apple-caption text-apple-gray-500">Barras = unidades vendidas/día</span>
            </div>
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={11}
                    tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : value)}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString('es-BO')} uds`, 'Unidades']}
                    labelFormatter={(label) => `Fecha ${label}`}
                  />
                  <Bar dataKey="units" radius={[6, 6, 0, 0]} fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="apple-h3 text-white">Mix de canales</h2>
              <span className="apple-caption text-apple-gray-500">Participación</span>
            </div>
            <div className="w-full h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelMix} dataKey="value" nameKey="channel" innerRadius={55} outerRadius={75} paddingAngle={4}>
                    {channelMix.map((entry, index) => (
                      <Cell key={entry.channel} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                    formatter={(value: any, _, item) => [`${money(Number(value))}`, (item && item.name) || 'Canal']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {channelMix.map((item, index) => (
                <div key={item.channel} className="flex items-center justify-between rounded-apple bg-white/5 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }} />
                    <span className="text-white/80">{item.channel}</span>
                  </div>
                  <div className="apple-caption text-apple-gray-300">
                    {money(item.value)} · {item.share}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="apple-h3 text-white">Top vendedores</h2>
              <span className="apple-caption text-apple-gray-500">Por ingresos</span>
            </div>
            <div className="space-y-2">
              {sellerLeaderboard.map((seller, index) => (
                <SellerRow key={seller.name || index} seller={seller} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="apple-h3 text-white">Sucursales con mayor aporte</h2>
            <span className="apple-caption text-apple-gray-500">Ingresos</span>
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchMix} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="branch" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis
                  stroke="rgba(255,255,255,0.6)"
                  fontSize={12}
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
                  formatter={(value: any) => [`${money(Number(value))}`, 'Ingresos']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {branchMix.map((_, idx) => (
                    <Cell key={idx} fill={BRANCH_COLORS[idx % BRANCH_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="apple-h3 text-white">Productos destacados</h2>
            <span className="apple-caption text-apple-gray-500">Top 5</span>
          </div>
          <TopProductsList items={topProducts} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="apple-h3 text-white">Últimas ventas</h2>
              <p className="apple-caption text-apple-gray-400">Detalle enriquecido de las 25 ventas más recientes</p>
            </div>
          </div>
          <div className="space-y-3">
            {latestRows.map((row) => {
              const saleDate = row.order_date ? format(new Date(row.order_date), 'dd/MM/yyyy') : 'Sin fecha';
              return (
                <div
                  key={row.order_id}
                  className="rounded-apple border border-white/5 bg-gradient-to-br from-white/5 via-transparent to-white/0 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-semibold">{row.product_name}</p>
                      <p className="apple-caption text-apple-gray-400">
                        #{row.order_no ?? row.order_id} · {saleDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-apple-green-300 font-semibold">{money(row.subtotal)}</p>
                      <p className="apple-caption text-apple-gray-400">{row.branch || 'Sin sucursal'}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-apple-gray-300">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-widest">
                      {row.channel || 'Mixto'}
                    </span>
                    <span>{row.seller_full_name || 'Vendedor sin asignar'}</span>
                    <span className="text-apple-gray-500">{row.quantity ?? 0} uds</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="apple-h3 text-white">Resumen mensual por sucursal</h2>
            <span className="apple-caption text-apple-gray-500">Dataset demo</span>
          </div>
          <div className="rounded-apple border border-white/5 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-apple-gray-300">
                <tr className="text-left">
                  <th className="py-3 px-4 font-medium">Fecha</th>
                  <th className="py-3 px-4 font-medium">Sucursal</th>
                  <th className="py-3 px-4 font-medium text-right">Ingresos</th>
                  <th className="py-3 px-4 font-medium text-right">Productos</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((row) => (
                  <tr
                    key={`${row.summary_date}-${row.branch}`}
                    className="border-t border-white/5 text-white/90 odd:bg-white/[0.02] hover:bg-white/10 transition-colors"
                  >
                    <td className="py-3 px-4">{row.summary_date}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold">{row.branch}</div>
                      <p className="apple-caption text-apple-gray-500">Distribución regional</p>
                    </td>
                    <td className="py-3 px-4 text-right">{money(row.total_revenue)}</td>
                    <td className="py-3 px-4 text-right">{row.total_products_sold ?? row.cantidad_productos ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function money(n: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(n || 0);
}

function HeroStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="relative overflow-hidden rounded-apple border border-white/10 bg-white/5 p-4">
      <div className="relative z-10">
        <p className="apple-caption text-apple-gray-400">{label}</p>
        <p className="text-2xl font-semibold text-white mt-1">{value}</p>
        <p className="apple-caption text-apple-gray-500">{helper}</p>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/0" />
    </div>
  );
}

function InsightCard({ title, stat, helper, description, tone, icon }: InsightCardData) {
  const bgClass =
    tone === 'positive'
      ? 'from-apple-green-500/20 via-transparent to-apple-green-900/30'
      : tone === 'negative'
      ? 'from-apple-red-500/20 via-transparent to-apple-red-900/30'
      : 'from-white/10 via-transparent to-white/0';
  const statClass =
    tone === 'positive'
      ? 'text-apple-green-200'
      : tone === 'negative'
      ? 'text-apple-red-200'
      : 'text-white';

  return (
    <div className="relative overflow-hidden rounded-apple border border-white/10 bg-white/5 p-4">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${bgClass}`} />
      <div className="relative z-10 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-apple-gray-300">
          {icon}
          <span>{title}</span>
        </div>
        <div>
          <p className={`text-2xl font-semibold ${statClass}`}>{stat}</p>
          <p className="apple-caption text-apple-gray-400">{helper}</p>
        </div>
        <p className="apple-body text-apple-gray-200">{description}</p>
      </div>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  sub,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const palette = {
    blue: 'from-apple-blue-500/20 via-apple-blue-600/10 to-apple-blue-900/40 border-apple-blue-500/40',
    green: 'from-apple-green-500/20 via-apple-green-600/10 to-apple-green-900/40 border-apple-green-500/40',
    orange: 'from-apple-orange-500/20 via-apple-orange-600/10 to-apple-orange-900/40 border-apple-orange-500/40',
    purple: 'from-purple-500/20 via-purple-600/10 to-purple-900/40 border-purple-500/40',
  } as const;
  return (
    <div className="glass-card p-4 border bg-white/5 relative overflow-hidden">
      <div className={`pointer-events-none absolute inset-px rounded-[10px] bg-gradient-to-br ${palette[tone]}`} />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-white/10 bg-white/10 text-white/80 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="apple-caption text-apple-gray-300">{label}</p>
          <p className="apple-h3 text-white">{value}</p>
          {sub && <p className="apple-caption text-apple-gray-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col text-sm text-white/90 min-w-[160px]">
      <span className="apple-caption text-apple-gray-400">{label}</span>
      <select
        className="mt-1 rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 pr-8 text-white transition focus:border-white/30 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'ALL' ? 'Todos' : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SellerRow({
  seller,
  index,
}: {
  seller: { name: string; revenue: number; tickets: number };
  index: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-apple border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-white/10 border border-white/15 text-white/80 flex items-center justify-center">
          {index + 1}
        </span>
        <div>
          <p className="text-white font-medium">{seller.name}</p>
          <p className="apple-caption text-apple-gray-400">{seller.tickets} tickets</p>
        </div>
      </div>
      <span className="text-apple-green-300 font-semibold">{money(seller.revenue)}</span>
    </div>
  );
}

function TopProductsList({
  items,
}: {
  items: { name: string; revenue: number; units: number; share: number }[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={item.name}
          className="rounded-apple border border-white/5 bg-white/5 px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 font-medium">
                {idx + 1}. {item.name}
              </p>
              <p className="apple-caption text-apple-gray-400">{item.units} uds</p>
            </div>
            <div className="text-right">
              <p className="text-white font-semibold">{money(item.revenue)}</p>
              <p className="apple-caption text-apple-gray-500">{item.share.toFixed(1)}% del total</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-apple-blue-400 to-apple-green-400"
              style={{ width: `${Math.min(100, item.share)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildPerformanceSeries(rows: SaleRow[]) {
  const map = new Map<string, { date: string; revenue: number; units: number; tickets: number }>();
  rows.forEach((row) => {
    const day = row.order_date ? row.order_date.slice(0, 10) : null;
    if (!day) return;
    const bucket = map.get(day) ?? { date: day, revenue: 0, units: 0, tickets: 0 };
    bucket.revenue += Number(row.subtotal ?? 0);
    bucket.units += Number(row.quantity ?? 0);
    bucket.tickets += 1;
    map.set(day, bucket);
  });
  const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  const series = sorted.slice(-30).map((entry) => ({
    ...entry,
    avgTicket: entry.tickets ? entry.revenue / entry.tickets : 0,
    label: format(new Date(entry.date), 'dd MMM'),
  }));
  const last30Total = series.reduce((sum, item) => sum + item.revenue, 0);
  const last30Units = series.reduce((sum, item) => sum + item.units, 0);
  const last7 = series.slice(-7).reduce((sum, item) => sum + item.revenue, 0);
  const prev7Series = sorted.slice(Math.max(0, sorted.length - 14), sorted.length - 7);
  const prev7 = prev7Series.reduce((sum, item) => sum + item.revenue, 0);
  const trend = prev7 ? ((last7 - prev7) / Math.max(prev7, 1)) * 100 : 0;
  return { series, trend, last30Total, last30Units };
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

function buildChannelMix(rows: SaleRow[]) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const channel = row.channel || 'Mixto';
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

function buildTopProducts(rows: SaleRow[]) {
  const map = new Map<string, { revenue: number; units: number }>();
  rows.forEach((row) => {
    const bucket = map.get(row.product_name) ?? { revenue: 0, units: 0 };
    bucket.revenue += Number(row.subtotal ?? 0);
    bucket.units += Number(row.quantity ?? 0);
    map.set(row.product_name, bucket);
  });
  const totalRevenue = Array.from(map.values()).reduce((sum, item) => sum + item.revenue, 0);
  return Array.from(map.entries())
    .map(([name, stats]) => ({
      name,
      revenue: stats.revenue,
      units: stats.units,
      share: totalRevenue ? (stats.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function buildSellerLeaderboard(rows: SaleRow[]) {
  const map = new Map<string, { revenue: number; tickets: number }>();
  rows.forEach((row) => {
    const key = row.seller_full_name || 'Sin asignar';
    const current = map.get(key) ?? { revenue: 0, tickets: 0 };
    current.revenue += Number(row.subtotal ?? 0);
    current.tickets += 1;
    map.set(key, current);
  });
  return Array.from(map.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);
}

function filterByPeriod(rows: SaleRow[], period: 'day' | 'week' | 'month') {
  const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return rows.filter((row) => {
    if (!row.order_date) return false;
    return new Date(row.order_date) >= cutoff;
  });
}
