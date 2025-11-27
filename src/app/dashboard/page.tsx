// src/app/dashboard/page.tsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useMemo, type ComponentProps } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, parseISO, isValid, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity, ArrowRight, Bell, ClipboardList, RotateCcw,
  UserPlus, Users2, DollarSign, Package, Calendar, Settings,
  AlertTriangle, CheckCircle, Clock, Sparkles, TrendingUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { normalizeRole, type Role } from '@/lib/auth/roles';

import WeatherStrip from '@/components/widgets/WeatherStrip';
import TrafficPanel from '@/components/widgets/TrafficPanel';
import { ModuleKey, moduleFlags } from '@/lib/config/featureFlags';
import { canAccessModule } from '@/lib/auth/permissions';
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

// Derivar el tipo de item desde las props de WeatherStrip
type Wx = ComponentProps<typeof WeatherStrip>['data'][number];

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

const MODULES: { title: string; desc: string; href: string; icon: React.ReactNode; module: ModuleKey }[] = [
  { title: 'Ventas', desc: 'Registra y analiza ventas', href: '/ventas', icon: <TrendingUp size={16} />, module: 'ventas' },
  { title: 'Inventario', desc: 'Stock y movimientos', href: '/inventario', icon: <Package size={16} />, module: 'inventario' },
  { title: 'RRHH y asistencia', desc: 'Marcajes y geolocalización', href: '/rrhh', icon: <Calendar size={16} />, module: 'rrhh' },
  { title: 'Productividad', desc: 'Horas efectivas y métricas', href: '/productividad', icon: <Activity size={16} />, module: 'productividad' },
  { title: 'Cajas', desc: 'Aperturas y cuadratura', href: '/cajas', icon: <DollarSign size={16} />, module: 'cajas' },
  { title: 'Configuración', desc: 'Usuarios y roles', href: '/configuracion', icon: <Settings size={16} />, module: 'configuracion' },
];

const CRM_SALES_PATH = '/ventas/registro-crm';

export default function DashboardHome() {
  // === DATA SOURCES ===
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const business = useBusinessMock();

  const role: Role = useMemo(() => normalizeRole(me?.role), [me?.role]);
  const name = (me?.full_name || '—').split(' ')[0];
  const demoOps = useDemoOps();

  const todayKey = useMemo(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()), []);
  const monthKey = useMemo(() => todayKey.slice(0, 7), [todayKey]);

  const { data: salesSummary } = useSWR('/endpoints/sales-summary', fetcher);
  const { data: returnsStats } = useSWR('/endpoints/stats/today-returns', fetcher);
  const { data: returnsReport } = useSWR('/endpoints/returns-report', fetcher);
  const { data: mySales } = useSWR(() => (me?.ok ? `/endpoints/my/sales?month=${monthKey}` : null), fetcher);
  const { data: myAttendance } = useSWR(() => (me?.ok && role !== 'promotor' ? `/endpoints/my/attendance?month=${monthKey}` : null), fetcher);
  const { data: salesReport } = useSWR('/endpoints/sales-report', fetcher);
  const { data: overview } = useSWR('/endpoints/metrics/overview', fetcher);

  // Clima y Tráfico
  const { data: wx } = useSWR(
    '/endpoints/ops/weather?cities=Cochabamba,El%20Alto,La%20Paz,Santa%20Cruz,Sucre',
    fetcher
  );
  const { data: tr } = useSWR(
    '/endpoints/ops/traffic?cities=Santa%20Cruz,La%20Paz,Cochabamba,El%20Alto,Sucre',
    fetcher
  );

  const overviewToday = overview?.today || { revenue: 0, tickets: 0, units: 0 };
  const overviewWeek = overview?.week || { revenue: 0, tickets: 0, units: 0 };
  const overviewMonth = overview?.month || { revenue: 0, tickets: 0, units: 0 };
  const returnsToday = overview?.returnsToday || { count: 0, amount: 0 };
  const attendanceToday = overview?.attendanceToday || { marks: 0, people: 0 };
  const cash = overview?.cash || { today: 0, month: 0 };

  // === DATOS DEL CLIMA ===
  const toRiskEs = (r: unknown): Wx['risk'] => {
    const v = String(r ?? '').toLowerCase();
    if (v === 'high' || v === 'alto') return 'Alto';
    if (v === 'med' || v === 'medio' || v === 'medium') return 'Medio';
    if (v === 'low' || v === 'bajo') return 'Bajo';
    return undefined;
  };

  const weatherData: Wx[] = useMemo(() => {
    const list = (wx?.cities ?? []) as any[];
    return list.map((c): Wx => ({
      city: String(c.city || c.name || ''),
      tempC: Math.round(Number(c.temp ?? c.tempC ?? 0)),
      condition: String(c.condition ?? ''),
      icon: String(c.icon ?? '01d'),
      rain1h: Number(c.rain_1h ?? c.rain1h ?? 0),
      windKmh: Number(c.wind_kmh ?? c.windKmh ?? 0),
      risk: toRiskEs(c.risk),
    }));
  }, [wx]);

  const alerts = useMemo(() => {
    if (!Array.isArray(returnsReport)) return [] as AlertItem[];
    return returnsReport.slice(0, 6).map((item: any, idx: number) => {
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
  }, [returnsReport]);

  const activity = useMemo(() => {
    const events: ActivityItem[] = [];

    const salesList = Array.isArray(mySales?.list) ? mySales.list : [];
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

    const days = Array.isArray(myAttendance?.days) ? myAttendance.days : [];
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
  }, [myAttendance, mySales]);

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

  const hourlyTrend = windowRange.revenue && prevRange.revenue
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
              <Link href="/dashboard/inventario" className="btn-secondary btn-sm">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard 
            title="Ingresos de hoy" 
            value={money(overviewToday.revenue)} 
            hint={`${num(overviewToday.units)} uds / ${num(overviewToday.tickets)} tickets`}
            icon={<DollarSign size={20} />}
            color="blue"
          />
          <KpiCard 
            title="Devoluciones (hoy)" 
            value={num(returnsToday.count)} 
            hint={money(returnsToday.amount)}
            icon={<RotateCcw size={20} />}
            color="orange"
          />
          <KpiCard 
            title="Caja (proxy)" 
            value={money(cash.today)} 
            hint={`Mes: ${money(cash.month)}`}
            icon={<CheckCircle size={20} />}
            color="green"
          />
          <KpiCard 
            title="Asistencia hoy" 
            value={num(attendanceToday.people)} 
            hint={`${num(attendanceToday.marks)} marcajes`}
            icon={<Calendar size={20} />}
            color="purple"
          />
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

      {/* === ACCIONES RÁPIDAS === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-apple-blue-500/15 rounded-apple border border-apple-blue-500/20 text-apple-blue-500">
                <Sparkles size={16} />
              </div>
              <h2 className="apple-h2">Acciones rápidas</h2>
            </div>
            <Link
              href="/dashboard/asesores/playbook-whatsapp"
              className="text-apple-caption text-apple-gray-500 hover:text-apple-blue-500 transition-colors"
            >
              Ver Central Operativa →
            </Link>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <QuickAction 
              href="/dashboard/promotores/registro" 
              icon={<Users2 size={16} />} 
              label="Registrar Promotor" 
              description="Nuevo promotor"
            />
            <QuickAction 
              href={CRM_SALES_PATH} 
              icon={<UserPlus size={16} />} 
              label="Registrar venta (asesor)" 
              description="Captura en CRM"
            />
            <QuickAction 
              href="/dashboard/asesores/devoluciones" 
              icon={<RotateCcw size={16} />} 
              label="Nueva Devolución" 
              description="Procesar devolución"
            />
            <QuickAction 
              href="/dashboard/vendedores" 
              icon={<ClipboardList size={16} />} 
              label="Reporte Vendedores" 
              description="Ver estadísticas"
            />
            <QuickAction 
              href="/dashboard/promotores/admin" 
              icon={<ClipboardList size={16} />} 
              label="Reporte Promotores" 
              description="Análisis de rendimiento"
            />
            <QuickAction 
              href="/dashboard/admin/resumen" 
              icon={<ClipboardList size={16} />} 
              label="Reporte Asistencia" 
              description="Control de asistencia"
            />
            <QuickAction 
              href="/cajas" 
              icon={<DollarSign size={16} />} 
              label="Caja diaria" 
              description="Turnos y cuadratura"
            />
          </div>
        </div>
      </motion.section>

      {/* === MÓDULOS PRINCIPALES === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
      >
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="apple-h2">Módulos Atlas Suite</h2>
              <p className="apple-caption text-apple-gray-400">Accede rápido a las áreas clave</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.filter((m) => moduleFlags[m.module] && canAccessModule(role, m.module)).map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="glass-card p-4 border hover:shadow-apple-lg transition flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-apple bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/15 flex items-center justify-center text-apple-blue-200">
                  {m.icon}
                </div>
                <div>
                  <div className="apple-h4 text-white">{m.title}</div>
                  <div className="apple-caption text-apple-gray-400">{m.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </motion.section>

      {/* === OPERATIVA DEL DÍA === */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <WeatherStrip data={weatherData} updatedAt={wx?.ts} />
        </div>
        <TrafficPanel
          incidents={tr?.incidents ?? []}
          updatedAt={tr?.updatedAt}
          onMapClick={() => { /* navegación opcional */ }}
        />
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

function QuickAction({ 
  href, 
  icon, 
  label, 
  description 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string;
  description?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      <Link
        href={href}
        className="group flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-apple hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-left"
      >
        <div className="p-2 bg-apple-blue-500/15 border border-apple-blue-500/25 rounded-apple group-hover:bg-apple-blue-500/25 transition-colors">
          {icon}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="apple-body font-medium text-white truncate">{label}</div>
          {description && (
            <div className="apple-caption text-apple-gray-400 truncate">{description}</div>
          )}
        </div>
      </Link>
    </motion.div>
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
