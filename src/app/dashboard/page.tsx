// src/app/dashboard/page.tsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, parseISO, isValid, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity, ArrowRight, Bell, RotateCcw,
  UserPlus, DollarSign, Package, Calendar,
  AlertTriangle, CheckCircle, Clock, Sparkles, TrendingUp, Smile, Truck, UserCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { normalizeRole, type Role } from '@/lib/auth/roles';

import { useDemoOps } from '@/lib/demo/state';
import { useBusinessMock } from '@/lib/demo/useBusinessMock';

const fetcher = async (u: string) => {
  const res = await fetch(u, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
};

type AlertItem = {
  id: string;
  title: string;
  subtitle: string;
  detail: string | null;
  amount: number;
  quantity: number;
  href: string;
  when: string | null;
  whenExact: string | null;
};

type ActivityItem = {
  id: string;
  title: string;
  when: string;
  whenExact: string;
  ts: number;
};

type RangeKey = 'day' | 'week' | 'month';

const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: 'day', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

const RANGE_LABELS: Record<RangeKey, string> = {
  day: 'Hoy',
  week: 'Semana',
  month: 'Mes',
};

const RANGE_WINDOWS: Record<RangeKey, number> = {
  day: 0,
  week: 6,
  month: 29,
};

type BusinessMockData = ReturnType<typeof useBusinessMock>;

const CRM_SALES_PATH = '/ventas/registro';

export default function DashboardHome() {
  // === DATA SOURCES ===
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const business = useBusinessMock();

  const role: Role = useMemo(() => normalizeRole(me?.role), [me?.role]);
  const name = (me?.full_name || '—').split(' ')[0];
  const demoOps = useDemoOps();

  const todayKey = useMemo(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()), []);
  const monthKey = useMemo(() => todayKey.slice(0, 7), [todayKey]);

  const { data: returnsReport } = useSWR('/endpoints/returns-report', fetcher);
  const { data: mySales } = useSWR(() => (me?.ok ? `/endpoints/my/sales?month=${monthKey}` : null), fetcher);
  const { data: myAttendance } = useSWR(() => (me?.ok && role !== 'promotor' ? `/endpoints/my/attendance?month=${monthKey}` : null), fetcher);
  const { data: salesReport } = useSWR('/endpoints/sales-report', fetcher);
  const { data: overview } = useSWR('/endpoints/metrics/overview', fetcher);

  const [rangeFilter, setRangeFilter] = useState<RangeKey>('day');

  const fallbackStats = useMemo(
    () => buildFallbackStats(business, todayKey),
    [business.dailySales, business.dailyReturns, todayKey]
  );

  const overviewToday = overview?.today || fallbackStats.sales.day;
  const overviewWeek = overview?.week || fallbackStats.sales.week;
  const overviewMonth = overview?.month || fallbackStats.sales.month;
  const attendanceToday = overview?.attendanceToday || fallbackStats.attendance.day;
  const cash = {
    today: overview?.cash?.today ?? fallbackStats.cash.day,
    month: overview?.cash?.month ?? fallbackStats.cash.month,
    week: fallbackStats.cash.week,
  };

  const selectedStats = useMemo(
    () => buildKpiSnapshot(business, fallbackStats, rangeFilter),
    [business.dailySales, business.dailyReturns, fallbackStats, rangeFilter]
  );

  const rangeDescription = useMemo(() => {
    const last = fallbackStats.lastDate;
    if (!last) return '';
    const formatted = formatHeadlineDate(last);
    if (rangeFilter === 'day') {
      return `Corte ${formatted}`;
    }
    return `${rangeFilter === 'week' ? 'Últimos 7 días' : 'Últimos 30 días'} · hasta ${formatted}`;
  }, [fallbackStats.lastDate, rangeFilter]);

  const lastSalesDate = business.dailySales.at(-1)?.date ?? todayKey;
  const lastDateObj = new Date(lastSalesDate);
  const thirtyDaysAgo = new Date(lastDateObj);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const prevWindowStart = new Date(thirtyDaysAgo);
  prevWindowStart.setDate(prevWindowStart.getDate() - 30);
  const windowRange = business.totalByRange(thirtyDaysAgo.toISOString().slice(0, 10), lastSalesDate);
  const prevRange = business.totalByRange(
    prevWindowStart.toISOString().slice(0, 10),
    new Date(thirtyDaysAgo).toISOString().slice(0, 10)
  );

  const hourlyTrend =
    windowRange.revenue && prevRange.revenue
      ? ((windowRange.revenue - prevRange.revenue) / Math.max(prevRange.revenue, 1)) * 100
      : 0;

  const weeklyTimeline = business.weeklySales.map((point) => ({
    week: point.week,
    revenue: point.revenue,
    target: business.monthlyTargets[point.week.slice(0, 7)]?.revenue ?? 0,
  }));

  const returnsSeries = Object.entries(business.returnsByWeek)
    .map(([week, amount]) => ({ week, amount }))
    .slice(-8);

  const scorecard = useMemo(() => {
    const monthTarget =
      (business.monthlyTargets[monthKey]?.revenue ?? fallbackStats.sales.month.revenue) || 1;
    const ventasActual = fallbackStats.sales.month.revenue;
    const ventasProgress = Math.min(130, Math.round((ventasActual / Math.max(monthTarget, 1)) * 100));
    const returnsRate = ventasActual ? fallbackStats.returns.month.amount / ventasActual : 0;
    const clientesScore = Math.max(60, Math.min(99, 100 - returnsRate * 4200));
    const operacionesScore = Math.max(
      55,
      Math.min(98, 100 - fallbackStats.returns.week.count * 1.4 + fallbackStats.sales.week.tickets * 0.06)
    );
    const talentoScore = Math.min(
      100,
      Math.round((fallbackStats.attendance.week.marks / Math.max(fallbackStats.attendance.week.people * 8, 1)) * 100)
    );
    const productividad = fallbackStats.sales.week.revenue / Math.max(fallbackStats.attendance.week.people, 1);

    return [
      {
        key: 'ventas',
        title: 'Ventas',
        value: money(ventasActual),
        sub: `Meta Bs ${money(monthTarget)}`,
        progress: ventasProgress,
        trend: hourlyTrend,
        icon: <TrendingUp size={18} />,
        tone: 'blue' as const,
      },
      {
        key: 'clientes',
        title: 'Clientes satisfechos',
        value: `${(100 - returnsRate * 100).toFixed(1)}%`,
        sub: `Tasa devoluciones ${(returnsRate * 100).toFixed(1)}%`,
        progress: clientesScore,
        trend: -returnsRate * 100,
        icon: <Smile size={18} />,
        tone: 'green' as const,
      },
      {
        key: 'operaciones',
        title: 'Operaciones al día',
        value: `${operacionesScore.toFixed(0)}%`,
        sub: `${num(fallbackStats.sales.week.tickets)} tickets / semana`,
        progress: operacionesScore,
        trend: operacionesScore - 85,
        icon: <Truck size={18} />,
        tone: 'orange' as const,
      },
      {
        key: 'talento',
        title: 'Talento y productividad',
        value: `${talentoScore.toFixed(0)}%`,
        sub: `Bs ${Math.round(productividad).toLocaleString('es-BO')} por persona`,
        progress: talentoScore,
        trend: talentoScore - 90,
        icon: <UserCheck size={18} />,
        tone: 'purple' as const,
      },
    ];
  }, [business.monthlyTargets, fallbackStats, hourlyTrend, monthKey]);

  const branchPulse = useMemo(() => {
    const branchMap = new Map<
      string,
      { entries: { date: string; revenue: number; units: number }[] }
    >();

    business.dailySales.forEach((entry) => {
      const list = branchMap.get(entry.branch) ?? [];
      list.push({ date: entry.date, revenue: entry.total, units: entry.units });
      branchMap.set(entry.branch, list);
    });

    return Array.from(branchMap.entries())
      .map(([branch, entries]) => {
        entries.sort((a, b) => a.date.localeCompare(b.date));
        const recent = entries.slice(-14);
        const last7 = recent.slice(-7);
        const prev7 = entries.slice(Math.max(0, entries.length - 14), entries.length - 7);
        const revenue = last7.reduce((sum, item) => sum + item.revenue, 0);
        const units = last7.reduce((sum, item) => sum + item.units, 0);
        const prevRevenue = prev7.reduce((sum, item) => sum + item.revenue, 0);
        const trend = prevRevenue ? ((revenue - prevRevenue) / Math.max(prevRevenue, 1)) * 100 : 0;
        const spark = entries.slice(-10).map((item) => ({ date: item.date, revenue: item.revenue }));
        return { branch, revenue, units, trend, spark };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [business.dailySales]);

  const alerts = useMemo(() => {
    const source = Array.isArray(returnsReport) && returnsReport.length
      ? returnsReport
      : business.dailyReturns.slice(-6).map((item, idx) => ({
          return_id: `mock-${idx}`,
          product_name: item.reason,
          branch: item.branch,
          return_date: item.date,
          customer_name: `Cliente ${idx + 1}`,
          quantity: Math.max(1, Math.round(item.amount / 400)),
          return_amount: item.amount,
          reason: item.reason,
        }));
    return source.slice(0, 6).map((item: any, idx: number) => {
      const date = parseDate(item?.return_date);
      const titleBase = item?.product_name ? String(item.product_name) : `Devolución #${item?.return_id ?? idx + 1}`;
      const branch = item?.branch ? `(${item.branch})` : '';
      return {
        id: `return-${item?.return_id ?? idx}`,
        title: `${titleBase} ${branch}`.trim(),
        subtitle: item?.customer_name ? `Cliente: ${item.customer_name}` : 'Devolución registrada',
        detail: item?.reason || null,
        amount: Number(item?.return_amount ?? 0),
        quantity: Number(item?.quantity ?? 0),
        href: '/dashboard/asesores/devoluciones',
        when: date ? relativeTime(date) : null,
        whenExact: date ? shortDate(date) : null,
      } satisfies AlertItem;
    });
  }, [business.dailyReturns, returnsReport]);

  const activity = useMemo(() => {
    const events: ActivityItem[] = [];

    const salesList = Array.isArray(mySales?.list) && mySales.list.length
      ? mySales.list
      : business.dailySales.slice(-8).map((entry, idx) => ({
          id: `mock-sale-${idx}`,
          order_date: `${entry.date}T10:00:00Z`,
          product_name: `${entry.channel} · ${entry.branch}`,
          total: entry.total,
        }));
    for (const sale of salesList) {
      const date = parseDate(sale?.order_date ?? sale?.created_at);
      if (!date) continue;
      events.push({
        id: `sale-${sale?.id ?? date.getTime()}`,
        title: `${sale?.product_name || 'Venta'} · ${money(Number(sale?.total ?? 0))}`,
        when: relativeTime(date),
        whenExact: shortDate(date),
        ts: date.getTime(),
      });
    }

    const days = Array.isArray(myAttendance?.days) && myAttendance.days.length
      ? myAttendance.days
      : business.dailySales.slice(-5).map((entry, idx) => {
          const hourOffset = (idx % 4) * 7;
          return {
            date: entry.date,
            first_in: `${entry.date}T08:${String(10 + hourOffset).padStart(2, '0')}:00Z`,
            last_out: `${entry.date}T18:${String(5 + hourOffset).padStart(2, '0')}:00Z`,
          };
        });
    for (const day of days) {
      const firstIn = parseDate(day?.first_in);
      if (firstIn) {
        events.push({
          id: `att-in-${day.date}`,
          title: `Entrada registrada · ${format(firstIn, 'HH:mm', { locale: es })}`,
          when: relativeTime(firstIn),
          whenExact: shortDate(firstIn),
          ts: firstIn.getTime(),
        });
      }
      const lastOut = parseDate(day?.last_out);
      if (lastOut) {
        events.push({
          id: `att-out-${day.date}`,
          title: `Salida registrada · ${format(lastOut, 'HH:mm', { locale: es })}`,
          when: relativeTime(lastOut),
          whenExact: shortDate(lastOut),
          ts: lastOut.getTime(),
        });
      }
    }

    events.sort((a, b) => b.ts - a.ts);
    return events.slice(0, 8);
  }, [business.dailySales, myAttendance, mySales]);

  const weeklySalesReport = useMemo(() => {
    const rows = Array.isArray(salesReport) ? salesReport : [];
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    let revenue = 0;
    let tickets = 0;
    let units = 0;
    rows.forEach((r: any) => {
      const d = parseDate(r?.order_date);
      if (!d) return;
      if (d >= start && d <= end) {
        revenue += Number(r?.subtotal ?? 0);
        tickets += 1;
        units += Number(r?.quantity ?? 0);
      }
    });
    return { revenue, tickets, units };
  }, [salesReport]);

  return (
    <div className="min-h-screen space-y-5 sm:space-y-6">
      {/* === HEADER HERO === */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden"
      >
        {/* Efectos de fondo */}
        <div className="absolute inset-0 bg-gradient-to-r from-apple-blue-600/10 via-transparent to-apple-green-600/10 rounded-apple-xl" />
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-apple-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-apple-green-500/5 rounded-full blur-3xl" />
        
        <div className="relative glass-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="p-4 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/20 rounded-apple-lg"
              >
                <Activity size={28} className="text-apple-blue-400" />
              </motion.div>
              <div>
              <motion.h1 
                  className="apple-h1 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Hola, {name} 👋 Bienvenido a Atlas Suite
                </motion.h1>
                <motion.p 
                  className="apple-body text-apple-gray-300"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  CRM operativo para ventas, caja e inventario en un solo lugar.
                </motion.p>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-2"
            >
              <Link href={CRM_SALES_PATH} className="btn-primary btn-sm">
                <UserPlus size={16} />
                Registrar venta
                <ArrowRight size={14} />
              </Link>
              <Link href="/cajas" className="btn-secondary btn-sm">
                <DollarSign size={16} />
                Caja diaria
              </Link>
              <Link href="/inventario" className="btn-secondary btn-sm">
                <Package size={16} />
                Ver inventario
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* === KPIs GRID === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="apple-h3">KPIs operativos</h2>
            <p className="apple-caption text-apple-gray-400">{selectedStats.description}</p>
          </div>
          <div className="inline-flex rounded-apple border border-white/10 bg-white/5 p-1">
            {RANGE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRangeFilter(tab.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-[10px] transition ${
                  rangeFilter === tab.key
                    ? 'bg-white/20 text-white shadow-apple-sm'
                    : 'text-apple-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title={`Ingresos (${selectedStats.label})`} 
            value={money(selectedStats.sales.revenue)} 
            hint={`${num(selectedStats.sales.units)} uds / ${num(selectedStats.sales.tickets)} tickets`}
            icon={<DollarSign size={20} />}
            color="blue"
            trend={formatTrend(selectedStats.sales.trend)}
          />
          <KpiCard 
            title={`Devoluciones (${selectedStats.label})`} 
            value={num(selectedStats.returns.count)} 
            hint={money(selectedStats.returns.amount)}
            icon={<RotateCcw size={20} />}
            color="orange"
            trend={formatTrend(selectedStats.returns.trend, true)}
          />
          <KpiCard 
            title={`Caja (${selectedStats.label})`} 
            value={money(selectedStats.cash.current)} 
            hint={`Mes: ${money(selectedStats.cash.monthToDate)}`}
            icon={<CheckCircle size={20} />}
            color="green"
          />
          <KpiCard 
            title={`Asistencia (${selectedStats.label})`} 
            value={num(selectedStats.attendance.people)} 
            hint={`${num(selectedStats.attendance.marks)} marcajes`}
            icon={<Calendar size={20} />}
            color="purple"
            trend={formatTrend(selectedStats.attendance.trend)}
          />
        </div>
      </motion.section>

      {/* === SCORECARD EXECUTIVO === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.26 }}
      >
        <div className="glass-card p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="apple-h3 text-white">Scorecard ejecutivo</h2>
              <p className="apple-caption text-apple-gray-400">Integración tipo balance scorecard</p>
            </div>
            <span className="apple-caption text-apple-gray-500">{rangeDescription}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {scorecard.map(({ key, ...tile }) => (
              <ScoreTile key={key} {...tile} />
            ))}
          </div>
        </div>
      </motion.section>

      {/* === PULSE DE SUCURSALES === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="apple-h3 text-white">Sucursales en tiempo real</h2>
              <p className="apple-caption text-apple-gray-400">Ingresos y ritmo de tickets últimos 7 días</p>
            </div>
            <span className="apple-caption text-apple-gray-500">Actualizado {rangeDescription}</span>
          </div>
          {branchPulse.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {branchPulse.map((branch) => (
                <BranchPulseCard key={branch.branch} {...branch} />
              ))}
            </div>
          ) : (
            <EmptyState title="Sin datos" subtitle="Conecta tus sucursales para ver el pulso operativo." />
          )}
        </div>
      </motion.section>

      {/* === COMPARATIVO SEMANAL === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.34 }}
      >
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="apple-h3">Comparativo semanal</h2>
              <p className="apple-caption text-apple-gray-400">
                Ventas frente a metas y diferencias de las últimas 8 semanas.
              </p>
            </div>
            <span className="apple-caption text-apple-gray-500">
              +{windowRange.revenue.toLocaleString('es-BO')} Bs · {hourlyTrend.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTimeline} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="week" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} formatter={(value:any) => [`Bs ${value.toLocaleString('es-BO')}`, 'Ventas']} />
                <Bar dataKey="target" fill="rgba(255,255,255,0.2)" radius={[6,6,0,0]} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.section>

      {/* === RETORNOS + STOCK CRÍTICO === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.36 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="glass-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-apple bg-apple-orange-500/20 border border-apple-orange-500/30">
              <RotateCcw size={18} className="text-apple-orange-400" />
            </div>
            <h3 className="apple-h3">Devoluciones semanales</h3>
          </div>
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={returnsSeries} margin={{ top: 8, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="week" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} formatter={(value:any) => [`Bs ${value.toLocaleString('es-BO')}`, 'Devoluciones']} />
                <Bar dataKey="amount" fill="#ef4444" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-apple bg-apple-green-500/20 border border-apple-green-500/30">
              <Sparkles size={16} className="text-apple-green-400" />
            </div>
            <h3 className="apple-h3">Stock crítico</h3>
          </div>
          <div className="space-y-2 text-xs">
            {business.dailyInventory.slice(-3).map((item) => (
              <div key={`${item.date}-${item.branch}`} className="flex items-center justify-between">
                <span>{item.date} · {item.branch}</span>
                <span className={`font-semibold ${item.critical ? 'text-apple-orange-300' : 'text-apple-green-300'}`}>
                  {item.stock} uds {item.critical ? '· Crítico' : ''}
                </span>
              </div>
            ))}
          </div>
          <p className="apple-caption text-apple-gray-400">
            Rotación estimada por canal y rango semanal. Activa alertas si baja de 30 uds.
          </p>
        </div>
      </motion.section>

      {/* === VISIÓN DE NEGOCIO (ventas/finanzas/gestión) === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.32 }}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <KpiCard
            title="Ventas semana"
            value={money(overviewWeek.revenue || weeklySalesReport.revenue)}
            hint={`${num(overviewWeek.tickets || weeklySalesReport.tickets)} tickets / ${num(overviewWeek.units || weeklySalesReport.units)} uds`}
            icon={<TrendingUp size={20} />}
            color="blue"
          />
          <KpiCard
            title="Ventas del mes"
            value={money(overviewMonth.revenue)}
            hint={`${num(overviewMonth.units)} uds`}
            icon={<DollarSign size={20} />}
            color="green"
          />
          <KpiCard
            title="Asistencia"
            value={num(attendanceToday.people)}
            hint={`${num(attendanceToday.marks)} marcajes`}
            icon={<Calendar size={20} />}
            color="purple"
          />
        </div>
      </motion.section>

      {/* === ALERTAS Y ACTIVIDAD === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Alertas */}
        <div className="lg:col-span-2">
          <div className="glass-card h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-apple-orange-500/20 rounded-apple border border-apple-orange-500/30">
                  <Bell size={18} className="text-apple-orange-400" />
                </div>
                <h3 className="apple-h3">Alertas y notificaciones</h3>
              </div>
              <Link 
                href="/inbox" 
                className="text-apple-gray-400 hover:text-white transition-colors text-apple-body"
              >
                Ver todas
              </Link>
            </div>
            
            <div className="space-y-3">
              {alerts.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="group flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-apple hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="p-2 bg-apple-orange-500/20 rounded-apple border border-apple-orange-500/30">
                      <AlertTriangle size={16} className="text-apple-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="apple-body font-medium text-white truncate">
                          {item.title}
                        </div>
                        {item.amount > 0 && (
                          <span className="apple-caption text-apple-orange-300 bg-apple-orange-500/10 border border-apple-orange-500/30 rounded-apple px-2 py-0.5">
                            {money(item.amount)}
                          </span>
                        )}
                      </div>
                      <div className="apple-caption text-apple-gray-400 truncate">
                        {item.subtitle}
                      </div>
                      {item.detail && (
                        <div className="apple-caption text-apple-gray-500 truncate">
                          {item.detail}
                        </div>
                      )}
                      {item.when && (
                        <div className="apple-caption text-apple-gray-600">
                          {item.when} {item.whenExact ? `• ${item.whenExact}` : ''}
                        </div>
                      )}
                    </div>
                    <ArrowRight 
                      size={16} 
                      className="text-apple-gray-500 group-hover:text-white transition-colors mt-1" 
                    />
                  </Link>
                </motion.div>
              ))}

              {!alerts.length && (
                <EmptyState 
                  icon={<CheckCircle size={24} />}
                  title="Todo en orden" 
                  subtitle="No hay devoluciones pendientes en este momento." 
                />
              )}
            </div>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-apple-green-500/20 rounded-apple border border-apple-green-500/30">
              <Clock size={18} className="text-apple-green-400" />
            </div>
            <h3 className="apple-h3">Mi actividad</h3>
          </div>
          
          <div className="space-y-3">
            {activity.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-b-0"
              >
                <div className="w-2 h-2 rounded-full bg-apple-green-400 mt-2 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="apple-body font-medium text-white truncate mb-1">
                    {event.title}
                  </div>
                  <div className="apple-caption text-apple-gray-400">
                    {event.when}
                  </div>
                  {event.whenExact && (
                    <div className="apple-caption text-apple-gray-500">
                      {event.whenExact}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {!activity.length && (
              <EmptyState 
                icon={<Clock size={24} />}
                title="Sin actividad reciente" 
                subtitle="Tu actividad aparecerá aquí."
              />
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

/* ===========================
   COMPONENTES UI
   =========================== */

function KpiCard({ 
  title, 
  value, 
  hint, 
  icon, 
  trend, 
  color = 'blue' 
}: { 
  title: string; 
  value: string; 
  hint?: string; 
  icon?: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-apple-blue-500/24 via-apple-blue-600/14 to-apple-blue-900/40 border-apple-blue-500/40 text-apple-blue-300',
    green: 'from-apple-green-500/24 via-apple-green-600/14 to-apple-green-900/40 border-apple-green-500/40 text-apple-green-300',
    orange: 'from-apple-orange-500/24 via-apple-orange-600/14 to-apple-orange-900/40 border-apple-orange-500/40 text-apple-orange-300',
    red: 'from-apple-red-500/24 via-apple-red-600/14 to-apple-red-900/40 border-apple-red-500/40 text-apple-red-300',
    purple: 'from-apple-blue-500/30 via-violet-600/20 to-apple-purple-900/40 border-apple-purple-500/40 text-apple-purple-300',
  } as const;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass-card transition-all duration-300 relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-px rounded-[10px] bg-gradient-to-br from-white/4 via-transparent to-white/0" />
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <div className="apple-caption text-apple-gray-400 mb-1">{title}</div>
          {hint && (
            <div className="apple-caption text-apple-gray-500 sm:hidden">{hint}</div>
          )}
        </div>
        {icon && (
          <div className={`w-9 h-9 rounded-[999px] bg-gradient-to-br ${colorClasses[color]} border flex items-center justify-center shadow-apple-sm`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="apple-h2 text-white mb-1 relative z-10 text-[14px] leading-[18px]">
        {value}
      </div>
      
      <div className="flex items-center justify-between relative z-10">
        {hint && (
          <div className="apple-caption text-apple-gray-500 hidden sm:block">{hint}</div>
        )}
        {trend && (
          <div className={`apple-caption font-medium ${trend.startsWith('+') ? 'text-apple-green-400' : trend.startsWith('-') ? 'text-apple-red-400' : 'text-apple-gray-400'}`}>
            {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
}

type ScoreTileProps = {
  key?: string;
  title: string;
  value: string;
  sub: string;
  progress: number;
  trend: number;
  icon: React.ReactNode;
  tone: 'blue' | 'green' | 'orange' | 'purple';
};

function ScoreTile({ title, value, sub, progress, trend, icon, tone }: ScoreTileProps) {
  const tones = {
    blue: { bg: 'from-apple-blue-500/15 to-apple-blue-600/5 border-apple-blue-500/25', fill: 'bg-apple-blue-500/80' },
    green: { bg: 'from-apple-green-500/15 to-apple-green-600/5 border-apple-green-500/25', fill: 'bg-apple-green-500/80' },
    orange: { bg: 'from-apple-orange-500/15 to-apple-orange-600/5 border-apple-orange-500/25', fill: 'bg-apple-orange-500/80' },
    purple: { bg: 'from-violet-500/15 to-violet-600/5 border-violet-500/25', fill: 'bg-violet-500/80' },
  } as const;
  const toneData = tones[tone];
  const trendColor = trend >= 0 ? 'text-apple-green-400' : 'text-apple-red-400';
  const trendLabel = `${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%`;

  return (
    <div className={`p-4 rounded-apple border bg-gradient-to-br ${toneData.bg} flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="apple-caption text-apple-gray-400">{title}</p>
          <p className="apple-h3 text-white">{value}</p>
          <p className="apple-caption text-apple-gray-500">{sub}</p>
        </div>
        <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/70">
          {icon}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${toneData.fill}`}
            style={{ width: `${Math.min(Math.max(progress, 5), 130)}%` }}
          />
        </div>
        <div className={`apple-caption font-medium ${trendColor}`}>{trendLabel} vs periodo previo</div>
      </div>
    </div>
  );
}

type BranchPulse = {
  branch: string;
  revenue: number;
  units: number;
  trend: number;
  spark: { date: string; revenue: number }[];
};

function BranchPulseCard({ branch, revenue, units, trend, spark }: BranchPulse) {
  const trendColor = trend >= 0 ? 'text-apple-green-400' : 'text-apple-red-400';

  return (
    <div className="rounded-apple border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">{branch}</p>
          <p className="apple-caption text-apple-gray-400">Últimos 7 días</p>
        </div>
        <div className={`text-sm font-medium ${trendColor}`}>
          {trend >= 0 ? '+' : ''}
          {trend.toFixed(1)}%
        </div>
      </div>
      <div>
        <p className="text-white text-xl font-semibold">{money(revenue)}</p>
        <p className="apple-caption text-apple-gray-400">{num(units)} uds</p>
      </div>
      <div className="h-16">
        {spark.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark} margin={{ top: 5, bottom: 0, left: -20, right: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Line type="monotone" dataKey="revenue" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="apple-caption text-apple-gray-500">Sin datos</div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ 
  icon, 
  title, 
  subtitle 
}: { 
  icon?: React.ReactNode;
  title: string; 
  subtitle?: string; 
}) {
  return (
    <div className="text-center py-8">
      {icon && (
        <div className="text-apple-gray-500 mb-3 flex justify-center">
          {icon}
        </div>
      )}
      <div className="apple-body font-medium text-apple-gray-300 mb-1">{title}</div>
      {subtitle && (
        <div className="apple-caption text-apple-gray-500">{subtitle}</div>
      )}
    </div>
  );
}

/* ===========================
   UTILIDADES
   =========================== */

type RangeAggregate = { revenue: number; units: number; tickets: number };
type ReturnAggregate = { count: number; amount: number };
type AttendanceAggregate = { people: number; marks: number };
type FallbackStats = {
  sales: Record<RangeKey, RangeAggregate>;
  returns: Record<RangeKey, ReturnAggregate>;
  attendance: Record<RangeKey, AttendanceAggregate>;
  cash: Record<RangeKey, number>;
  lastDate: string;
};

type KpiSnapshot = {
  label: string;
  description: string;
  sales: RangeAggregate & { trend: number };
  returns: ReturnAggregate & { trend: number };
  attendance: AttendanceAggregate & { trend: number };
  cash: { current: number; monthToDate: number };
};

function buildFallbackStats(business: BusinessMockData, todayKey: string): FallbackStats {
  const lastSalesDate = business.dailySales.at(-1)?.date ?? todayKey;
  const lastDate = new Date(`${lastSalesDate}T00:00:00Z`);

  const aggregateSales = (range: RangeKey): RangeAggregate => {
    const daysBack = RANGE_WINDOWS[range];
    const start = new Date(lastDate);
    start.setUTCDate(start.getUTCDate() - daysBack);
    const startKey = start.toISOString().slice(0, 10);
    const entries = business.dailySales.filter((entry) => entry.date >= startKey && entry.date <= lastSalesDate);
    const revenue = entries.reduce((sum, entry) => sum + entry.total, 0);
    const units = entries.reduce((sum, entry) => sum + entry.units, 0);
    const tickets = entries.reduce(
      (sum, entry) => sum + (entry.tickets ?? Math.max(1, Math.round(entry.units * 0.85))),
      0
    );
    return { revenue, units, tickets };
  };

  const aggregateReturns = (range: RangeKey): ReturnAggregate => {
    const daysBack = RANGE_WINDOWS[range];
    const start = new Date(lastDate);
    start.setUTCDate(start.getUTCDate() - daysBack);
    const startKey = start.toISOString().slice(0, 10);
    const entries = business.dailyReturns.filter((entry) => entry.date >= startKey && entry.date <= lastSalesDate);
    const amount = entries.reduce((sum, entry) => sum + entry.amount, 0);
    return { count: entries.length, amount };
  };

  const sales: Record<RangeKey, RangeAggregate> = {
    day: aggregateSales('day'),
    week: aggregateSales('week'),
    month: aggregateSales('month'),
  };

  const attendance: Record<RangeKey, AttendanceAggregate> = {
    day: deriveAttendance('day', sales.day.units),
    week: deriveAttendance('week', sales.week.units),
    month: deriveAttendance('month', sales.month.units),
  };

  const returns: Record<RangeKey, ReturnAggregate> = {
    day: aggregateReturns('day'),
    week: aggregateReturns('week'),
    month: aggregateReturns('month'),
  };

  const cash: Record<RangeKey, number> = {
    day: Math.round(sales.day.revenue * 0.34),
    week: Math.round(sales.week.revenue * 0.32),
    month: Math.round(sales.month.revenue * 0.3),
  };

  return { sales, returns, attendance, cash, lastDate: lastSalesDate };
}

function buildKpiSnapshot(
  business: BusinessMockData,
  fallback: FallbackStats,
  range: RangeKey
): KpiSnapshot {
  const endKey = business.dailySales.at(-1)?.date ?? fallback.lastDate;
  const end = new Date(`${endKey}T00:00:00Z`);
  const days = RANGE_WINDOWS[range];
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  const startKey = start.toISOString().slice(0, 10);

  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - days);

  const salesCurrent = aggregateSalesRange(business.dailySales, startKey, endKey);
  const salesPrev = aggregateSalesRange(
    business.dailySales,
    prevStart.toISOString().slice(0, 10),
    prevEnd.toISOString().slice(0, 10)
  );

  const returnsCurrent = aggregateReturnsRange(business.dailyReturns, startKey, endKey);
  const returnsPrev = aggregateReturnsRange(
    business.dailyReturns,
    prevStart.toISOString().slice(0, 10),
    prevEnd.toISOString().slice(0, 10)
  );

  const sales =
    salesCurrent.revenue > 0 ? salesCurrent : fallback.sales[range];
  const salesPrevValue = salesPrev.revenue > 0 ? salesPrev.revenue : fallback.sales[range].revenue * 0.8;

  const returns =
    returnsCurrent.amount > 0 ? returnsCurrent : fallback.returns[range];
  const returnsPrevValue =
    returnsPrev.amount > 0 ? returnsPrev.amount : Math.max(returns.amount * 0.85, 1);

  const attendance = {
    ...fallback.attendance[range],
    trend: 0,
  };

  const cashCurrent =
    salesCurrent.revenue > 0
      ? Math.round(
          salesCurrent.revenue * (range === 'day' ? 0.34 : range === 'week' ? 0.32 : 0.3)
        )
      : fallback.cash[range];

  const description =
    range === 'day'
      ? `Hoy · ${formatHeadlineDate(endKey)}`
      : range === 'week'
        ? `Últimos 7 días · hasta ${formatHeadlineDate(endKey)}`
        : `Últimos 30 días · hasta ${formatHeadlineDate(endKey)}`;

  return {
    label: RANGE_LABELS[range],
    description,
    sales: {
      ...sales,
      trend: calculateTrend(sales.revenue, salesPrevValue),
    },
    returns: {
      ...returns,
      trend: calculateTrend(returns.amount, returnsPrevValue),
    },
    attendance,
    cash: {
      current: cashCurrent,
      monthToDate: fallback.cash.month,
    },
  };
}

function aggregateSalesRange(
  entries: BusinessMockData['dailySales'],
  startKey: string,
  endKey: string
): RangeAggregate {
  const filtered = entries.filter((entry) => entry.date >= startKey && entry.date <= endKey);
  const revenue = filtered.reduce((sum, entry) => sum + entry.total, 0);
  const units = filtered.reduce((sum, entry) => sum + entry.units, 0);
  const tickets = filtered.reduce((sum, entry) => sum + Math.max(1, Math.round(entry.units / 1.3)), 0);
  return { revenue, units, tickets };
}

function aggregateReturnsRange(
  entries: BusinessMockData['dailyReturns'],
  startKey: string,
  endKey: string
): ReturnAggregate {
  const filtered = entries.filter((entry) => entry.date >= startKey && entry.date <= endKey);
  const amount = filtered.reduce((sum, entry) => sum + entry.amount, 0);
  return { count: filtered.length, amount };
}

function calculateTrend(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / Math.max(previous, 1)) * 100;
}

function deriveAttendance(range: RangeKey, units: number): AttendanceAggregate {
  const base = range === 'day' ? 18 : range === 'week' ? 65 : 180;
  const divisor = range === 'day' ? 2.2 : range === 'week' ? 2.8 : 3.2;
  const people = Math.max(base, Math.round(units / divisor));
  const marksMultiplier = range === 'day' ? 2 : range === 'week' ? 8 : 24;
  return { people, marks: people * marksMultiplier };
}

function formatHeadlineDate(dateISO: string): string {
  const parsed = parseDate(dateISO);
  if (!parsed) return dateISO;
  return format(parsed, 'dd MMM yyyy', { locale: es });
}

function formatTrend(value?: number, invert = false) {
  if (!Number.isFinite(value) || !value) return undefined;
  const effective = invert ? -value : value;
  const prefix = effective > 0 ? '+' : '';
  return `${prefix}${effective.toFixed(1)}% vs periodo previo`;
}

function num(n: number) { 
  return (n ?? 0).toLocaleString('es-BO'); 
}

function money(n: number) { 
  return `Bs ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`; 
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  const date = parseISO(String(value));
  return isValid(date) ? date : null;
}

function relativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

function shortDate(date: Date): string {
  return format(date, 'dd MMM • HH:mm', { locale: es });
}
