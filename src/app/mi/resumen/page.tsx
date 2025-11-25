'use client';

import { useMemo, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, User2, Activity, ListChecks, ShoppingCart, CircleDollarSign, ShieldCheck, LogIn, LogOut } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then(r => r.json());

type Role = 'admin'|'promotor'|'coordinador'|'lider'|'asesor'|'unknown';
const norm = (r?: string): Role => {
  const x = (r || '').toUpperCase();
  if (['GERENCIA', 'ADMIN', 'ADMINISTRADOR'].includes(x)) return 'admin';
  if (['PROMOTOR', 'PROMOTORA'].includes(x)) return 'promotor';
  if (['COORDINADOR', 'COORDINADORA', 'COORDINACION'].includes(x)) return 'coordinador';
  if (['LIDER', 'JEFE', 'SUPERVISOR'].includes(x)) return 'lider';
  if (['ASESOR', 'VENDEDOR', 'VENDEDORA'].includes(x)) return 'asesor';
  return 'unknown';
};

type QuickAction = {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
  highlight?: boolean;
  show?: boolean;
};

export default function MiResumenPage() {
  const router = useRouter();
  const { data: me } = useSWR('/endpoints/me', fetcher);
  const role: Role = useMemo(() => norm(me?.role), [me?.role]);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const { data: att, isLoading: attLoading } = useSWR(role === 'promotor' ? null : `/endpoints/my/attendance?month=${month}`, fetcher);
  const { data: sal, isLoading: salLoading } = useSWR(`/endpoints/my/sales?month=${month}`, fetcher);

  const name = me?.full_name || '—';
  const attKpis = att?.kpis ?? { dias_con_marca: 0, entradas: 0, salidas: 0, pct_geocerca_ok: 0 };
  const salKpis = sal?.kpis ?? { ventas: 0, pedidos: 0, total: 0 };

  const canReviewPerms = role === 'admin' || role === 'coordinador' || role === 'lider';
  const permsPath = canReviewPerms ? '/dashboard/permisos' : '/permisos/solicitar';
  const goPermisos = () => router.push(permsPath);
  const goAsistencia = () => router.push('/asistencia');
  const goRegistrarVenta = () => router.push('/dashboard/promotores/registro');
  const goMisVentas = () => router.push('/dashboard/promotores');

  const quickActions = useMemo<QuickAction[]>(() => ([
    {
      label: 'Ingresar venta',
      description: 'Registra una venta o pedido en segundos.',
      href: '/dashboard/promotores/registro',
      icon: <ShoppingCart size={16} />,
      highlight: true,
    },
    {
      label: 'Mis ventas',
      description: 'Consulta tu histórico y comisiones.',
      href: '/dashboard/promotores',
      icon: <ListChecks size={16} />,
    },
    {
      label: 'Mi resumen',
      description: 'KPIs y top productos del mes.',
      href: '/mi/resumen',
      icon: <Activity size={16} />,
    },
    {
      label: 'Marcar asistencia',
      description: 'Entrada / salida y geocerca.',
      href: '/asistencia',
      icon: <LogIn size={16} />,
      show: role !== 'promotor',
    },
    {
      label: canReviewPerms ? 'Gestión de permisos' : 'Solicitar permiso',
      description: canReviewPerms ? 'Revisa y aprueba solicitudes.' : 'Envía una nueva solicitud.',
      href: permsPath,
      icon: <ShieldCheck size={16} />,
    },
  ].filter((item) => item.show !== false)), [role, canReviewPerms, permsPath]);

  const renderActions = (compact = false) => quickActions.map((action) => (
    <motion.button
      key={action.href}
      onClick={() => router.push(action.href)}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={[
        'group w-full rounded-xl border text-left transition-all duration-200',
        compact ? 'p-3' : 'p-4',
        action.highlight
          ? 'bg-gradient-to-r from-apple-blue-500/10 via-apple-blue-500/5 to-apple-green-500/10 border-[color:var(--app-border-strong)] shadow-[0_14px_45px_rgba(66,133,244,0.18)]'
          : 'bg-[color:var(--app-card)]/60 border-[color:var(--app-border)] hover:border-[color:var(--app-border-strong)] hover:bg-[color:var(--hover-surface)]',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className={[
          'pill',
          action.highlight
            ? 'bg-black/10 border-white/10 text-white'
            : 'bg-[color:var(--app-bg)] border-[color:var(--app-border)] text-[color:var(--app-foreground)]',
        ].join(' ')}>
          {action.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight">{action.label}</div>
          <p className="apple-caption text-[color:var(--app-muted)]">{action.description}</p>
        </div>
        <ArrowUpRight
          size={16}
          className={action.highlight
            ? 'text-white'
            : 'text-[color:var(--app-muted)] group-hover:text-[color:var(--app-foreground)]'}
        />
      </div>
    </motion.button>
  ));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--app-bg)] text-[color:var(--app-foreground)] transition-colors duration-500 ease-apple">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_18%_-12%,rgba(124,142,255,0.22),transparent_70%)] opacity-80 dark:bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(96,165,250,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(880px_520px_at_92%_-6%,rgba(255,175,210,0.18),transparent_65%)] opacity-70 dark:bg-[radial-gradient(900px_500px_at_90%_-20%,rgba(168,85,247,0.12),transparent_55%)]" />
      </div>

      <div className="relative z-10">
        {/* HEADER usando tus utilidades */}
        <header className="sticky top-0 z-sticky border-b border-[color:var(--app-border)] bg-[color:var(--app-bg)]/80 backdrop-blur-apple transition-colors duration-500 dark:border-white/10 dark:bg-black/30">
          <div className="apple-container py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="pill"><Activity size={18} /></div>
              <div>
                <h1 className="apple-h1">Mi resumen</h1>
                <p className="apple-caption text-[color:var(--app-muted)]">Asistencia y ventas del mes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {role !== 'promotor' && (
                <button
                  onClick={goAsistencia}
                  className="btn-primary btn-sm"
                  title="Ir a marcar asistencia"
                >
                  <span className="pill"><LogIn size={16} /></span>
                  <span className="font-medium">Marcar asistencia</span>
                </button>
              )}
              {/* Botón Gestión de permisos (pill de tu sistema) */}
              <button
                onClick={goPermisos}
                className="btn-secondary btn-sm"
                title={canReviewPerms ? 'Abrir dashboard de permisos' : 'Solicitar un permiso'}
              >
                <span className="pill"><ShieldCheck size={16} /></span>
                <span className="font-medium">Gestión de permisos</span>
              </button>

              <LogoutButton
                type="button"
                className="btn-ghost btn-sm"
                title="Cerrar sesión"
              >
                <span className="pill"><LogOut size={16} /></span>
                <span className="font-medium">Salir</span>
              </LogoutButton>

              <div className="hidden md:flex items-center gap-2 text-[color:var(--app-muted)]">
                <CalendarDays size={18} />
                <span className="apple-caption">Mes</span>
              </div>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="field-sm w-[160px]"
              />
            </div>
          </div>
        </header>

        {/* CTA móvil coherente con tus botones */}
        <div className="md:hidden fixed right-4 bottom-4 z-fixed flex flex-col gap-3">
          <button
            onClick={goRegistrarVenta}
            className="btn-primary btn-sm shadow-apple"
          >
            <ShoppingCart size={16} />
            <span className="font-medium">Ingresar venta</span>
          </button>
          <button
            onClick={goMisVentas}
            className="btn-secondary btn-sm shadow-apple"
          >
            <ListChecks size={16} />
            <span className="font-medium">Mis ventas</span>
          </button>
          {role !== 'promotor' && (
            <button
              onClick={goAsistencia}
              className="btn-primary btn-sm shadow-apple"
            >
              <LogIn size={16} />
              <span className="font-medium">Marcar asistencia</span>
            </button>
          )}
          <button
            onClick={goPermisos}
            className="btn-secondary btn-sm shadow-apple"
          >
            <ShieldCheck size={16} />
            <span className="font-medium">Permisos</span>
          </button>
          <LogoutButton
            type="button"
            className="btn-ghost btn-sm shadow-apple"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="font-medium">Salir</span>
          </LogoutButton>
        </div>

        <main className="apple-container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
            <aside className="space-y-4 lg:sticky lg:top-28">
              <section className="glass-card p-5 shadow-apple transition-colors duration-500">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="apple-caption text-[color:var(--app-muted)] uppercase tracking-[0.12em]">Panel del promotor</p>
                    <h3 className="apple-h3 leading-tight">{name}</h3>
                    <p className="apple-caption text-[color:var(--app-muted)] mt-1">Atajos directos a tus acciones diarias.</p>
                  </div>
                  <span className="pill bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-[color:var(--app-border)] text-[color:var(--app-foreground)]">
                    Rápido
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <button onClick={goRegistrarVenta} className="btn-primary w-full justify-center gap-2">
                    <ShoppingCart size={16} />
                    <span className="font-semibold">Ingresar venta</span>
                  </button>
                  <button onClick={goMisVentas} className="btn-secondary w-full justify-center gap-2">
                    <ListChecks size={16} />
                    <span className="font-semibold">Mis ventas</span>
                  </button>
                </div>
              </section>

              <section className="glass-card p-4 transition-colors duration-500 hidden lg:block">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="pill"><Activity size={16} /></span>
                    <span className="apple-footnote font-semibold">Accesos rápidos</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {renderActions()}
                </div>
              </section>
            </aside>

            <div className="space-y-8">
              <div className="lg:hidden space-y-2">
                <div className="apple-footnote text-[color:var(--app-muted)] uppercase tracking-[0.08em]">Accesos rápidos</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {renderActions(true)}
                </div>
              </div>

              {/* Identidad */}
              <section className="glass-card transition-colors duration-500">
                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4 items-center">
                  <div className="flex items-center gap-2 text-[color:var(--app-muted)]">
                    <User2 size={18} />
                    <span className="apple-footnote font-semibold">Usuario</span>
                  </div>
                  <div className="field bg-[color:var(--app-card)] text-[color:var(--app-foreground)] dark:bg-white/5 dark:text-white">{name}</div>
                </div>
              </section>

              {/* KPIs */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {role !== 'promotor' && (
                  <>
                    <Kpi title="Días con marca" value={attKpis.dias_con_marca} icon={<ListChecks />} />
                    <Kpi title="Entradas" value={attKpis.entradas} icon={<Activity />} />
                    <Kpi title="Salidas" value={attKpis.salidas} icon={<Activity />} />
                    <Kpi title="% Geo OK" value={attKpis.pct_geocerca_ok} suffix="%" icon={<Activity />} />
                  </>
                )}
                <Kpi title="Ventas" value={salKpis.ventas} icon={<ShoppingCart />} />
                <Kpi title="Pedidos" value={salKpis.pedidos} icon={<ShoppingCart />} />
                <Kpi title="Total Bs" value={salKpis.total} money icon={<CircleDollarSign />} />
              </section>

              <div className={`grid gap-6 ${role === 'promotor' ? 'grid-cols-1' : 'lg:grid-cols-[2fr,3fr]'}`}>
                {/* Asistencia timeline */}
                {role !== 'promotor' && (
                  <section className="glass-card transition-colors duration-500">
                    <h3 className="apple-h3 mb-4">Asistencia</h3>
                    {attLoading ? (
                      <Skeleton text="Cargando asistencia…" />
                    ) : (
                      <div className="grid gap-3">
                        {att?.days?.length ? (
                          att.days.map((d: any) => (
                            <div key={d.date} className="glass-panel p-4 transition-colors duration-500">
                              <div className="font-semibold mb-3">{d.date}</div>
                              <div className="flex flex-wrap gap-2">
                                {d.marks.map((m: any) => {
                                  const t = new Date(m.taken_at || m.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
                                  const isIn = m.type === 'in';
                                  return (
                                    <span
                                      key={m.id}
                                      className={`badge ${isIn ? 'badge-success' : 'badge-danger'}`}
                                    >
                                      {m.type.toUpperCase()} · {t}
                                      {typeof m.distance_m === 'number' && <span className="opacity-75"> · {Math.round(m.distance_m)}m</span>}
                                      {m.site_name && <span className="opacity-75"> · {m.site_name}</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="apple-caption text-[color:var(--app-muted)]">Sin marcas este mes.</div>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* Ventas + Top productos */}
                <section className="grid gap-6">
                  {/* Top productos */}
                  <div className="glass-card transition-colors duration-500">
                    <h3 className="apple-h3 mb-3">Top productos</h3>
                    {salLoading ? (
                      <Skeleton text="Cargando productos…" />
                    ) : (
                      <div className="grid gap-2">
                        {sal?.topProducts?.length ? (
                          sal.topProducts.map((p: any) => (
                            <div key={p.name} className="flex items-center justify-between border-b border-[color:var(--app-border)] pb-2">
                              <div className="flex items-center gap-2">
                                <span className="badge-neutral">●</span>
                                <span>{p.name}</span>
                              </div>
                              <div className="apple-caption text-[color:var(--app-muted)]">
                                {p.qty} uds · Bs {Math.round(p.amount).toLocaleString('es-BO')}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="apple-caption text-[color:var(--app-muted)]">Sin ventas este mes.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mis ventas */}
                  <div className="glass-card max-h-[420px] overflow-auto transition-colors duration-500">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="apple-h3">Mis ventas</h3>
                      <button onClick={goMisVentas} className="btn-ghost btn-xs gap-2">
                        <ListChecks size={14} />
                        <span className="font-semibold">Ver todo</span>
                      </button>
                    </div>
                    {salLoading ? (
                      <Skeleton text="Cargando ventas…" />
                    ) : (
                      <table className="table-apple">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Pedido</th>
                            <th>Producto</th>
                            <th>Cant</th>
                            <th className="text-right">Total (Bs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sal?.list?.map((r: any) => (
                            <tr key={r.id}>
                              <td>{r.order_date?.slice(0, 10)}</td>
                              <td>{r.order_id}</td>
                              <td>{r.product_name}</td>
                              <td>{r.qty}</td>
                              <td className="text-right">
                                {Number(r.total || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          {!sal?.list?.length && (
                            <tr>
                              <td colSpan={5} className="apple-caption text-[color:var(--app-muted)]">Sin ventas.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* === KPI usando tus utilidades === */
function Kpi({
  title, value, suffix = '', money = false, icon,
}: {
  title: string;
  value: number;
  suffix?: string;
  money?: boolean;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      className="card-hover"
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <span className="apple-caption">{title}</span>
        <span className="pill">{icon}</span>
      </div>
      <div className="mt-2 text-apple-h2 font-semibold">
        {money ? 'Bs ' : ''}
        {Number(value || 0).toLocaleString('es-BO')}
        {suffix}
      </div>
    </motion.div>
  );
}

function Skeleton({ text }: { text?: string }) {
  return (
    <div>
      <div className="h-3 w-40 bg-white/10 rounded mb-2" />
      <div className="h-3 w-64 bg-white/10 rounded mb-2" />
      <div className="h-3 w-56 bg-white/10 rounded mb-2" />
      {text && <div className="apple-caption mt-3">{text}</div>}
    </div>
  );
}
