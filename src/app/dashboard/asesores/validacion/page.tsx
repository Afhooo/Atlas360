'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock3, Filter, Search, XCircle, Ticket, MapPin, User, Package,
  ArrowUpRight, ArrowDownRight, Activity,
} from 'lucide-react';

type SalesRow = {
  id: string;
  sale_date: string;
  created_at: string;
  seller_name: string;
  branch: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  approval_status?: string | null;
  approval_ticket?: string | null;
  approval_note?: string | null;
};

type SalesResp = {
  rows: SalesRow[];
};

type MeResp = {
  ok: boolean;
  id?: string;
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
  local?: string | null;
};

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then((r) => r.json());
const iso = (d: Date) => d.toISOString().slice(0, 10);
const startOfYear = () => new Date(new Date().getFullYear(), 0, 1);
const endOfYear = () => new Date(new Date().getFullYear(), 11, 31);
const fmtBs = (n: number) => `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ValidacionVentasAsesores() {
  const [from, setFrom] = useState(iso(startOfYear())); // cubre todo el año
  const [to, setTo] = useState(iso(endOfYear()));
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('');
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [ticketById, setTicketById] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  const { data: me } = useSWR<MeResp>('/endpoints/me', fetcher);

  const roleUpper = (me?.role || '').toUpperCase();
  const isLider = roleUpper === 'LIDER';
  const scope = isLider ? 'team' : 'all';

  const qs = new URLSearchParams({ from, to, q, status: 'pending', scope });
  if (branch) qs.set('branch', branch);
  if (isLider && me?.id) qs.set('leader_id', me.id);
  const { data, mutate, isLoading } = useSWR<SalesResp>(`/endpoints/asesores/sales?${qs.toString()}`, fetcher);

  const rows = useMemo(() => {
    let list = data?.rows || [];
    if (branch) list = list.filter((r) => (r.branch || '').toLowerCase() === branch.toLowerCase());
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((r) =>
        (r.seller_name || '').toLowerCase().includes(needle) ||
        (r.product_name || '').toLowerCase().includes(needle) ||
        (r.customer_name || '').toLowerCase().includes(needle) ||
        (r.customer_phone || '').toLowerCase().includes(needle) ||
        (r.branch || '').toLowerCase().includes(needle)
      );
    }
    return [...list].sort((a, b) => b.sale_date.localeCompare(a.sale_date));
  }, [data?.rows, branch, q]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    (data?.rows || []).forEach((r) => { if (r.branch) set.add(r.branch); });
    return ['Todas', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [data?.rows]);

  const stats = useMemo(() => {
    const items = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const total = rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unit_price || 0), 0);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;

    const sumByKey = (key: string) =>
      rows
        .filter((r) => (r.sale_date || '').startsWith(key))
        .reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unit_price || 0), 0);

    const monthTotal = sumByKey(monthKey);
    const prevMonthTotal = sumByKey(prevKey);
    const monthDeltaPct = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100 : null;

    return {
      count: rows.length,
      items,
      total,
      monthTotal,
      prevMonthTotal,
      monthDeltaPct,
      monthLabel: now.toLocaleString('es-BO', { month: 'long', year: 'numeric' }),
    };
  }, [rows]);

  const approver = me?.full_name || me?.username || 'Validador';

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !window.confirm('¿Rechazar esta venta?')) return;
    setActioning(`${id}-${status}`);
    try {
      const res = await fetch(`/endpoints/asesores/sales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          note: noteById[id],
          ticket: ticketById[id],
          approver,
          leader_id: isLider ? me?.id : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) throw new Error(json?.error || 'No se pudo actualizar');
      mutate();
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar estado');
    } finally {
      setActioning(null);
    }
  };

  const isUnauthorized = me && (roleUpper === 'PROMOTOR' || roleUpper === 'ASESOR');

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="glass-card text-center p-8">
          <p className="apple-body text-apple-gray-300">No tienes permisos para validar ventas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="glass-card sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-apple bg-apple-blue-500/20 border border-apple-blue-500/30">
            <Clock3 className="text-apple-blue-300" size={20} />
          </div>
          <div>
            <h1 className="apple-h1">Validación de ventas (Asesores)</h1>
            <p className="apple-caption text-apple-gray-300">
              Autoriza ventas pendientes de tu equipo antes de que entren al dashboard.
            </p>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <section className="glass-card my-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="apple-caption text-apple-gray-400">Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="field w-full" />
          </div>
          <div>
            <label className="apple-caption text-apple-gray-400">Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="field w-full" />
          </div>
          <div>
            <label className="apple-caption text-apple-gray-400">Sucursal</label>
            <div className="flex items-center gap-2">
              <span className="pill"><Filter size={14} /></span>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} className="field w-full">
                {branches.map((b) => (
                  <option key={b} value={b === 'Todas' ? '' : b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="apple-caption text-apple-gray-400">Buscar</label>
            <div className="flex items-center gap-2">
              <span className="pill"><Search size={14} /></span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Asesor, producto, cliente, sucursal…"
                className="field w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: 'Ventas pendientes',
            value: stats.count,
            subtitle: 'Esperando aprobación',
            icon: Clock3,
            color: 'blue',
          },
          {
            title: 'Items',
            value: stats.items,
            subtitle: 'Unidades en cola',
            icon: Package,
            color: 'green',
          },
          {
            title: 'Total pendiente',
            value: fmtBs(stats.total),
            subtitle: 'Monto a validar',
            icon: Ticket,
            color: 'teal',
          },
          {
            title: 'Mes en curso',
            value: fmtBs(stats.monthTotal),
            subtitle: stats.monthLabel,
            icon: Activity,
            color: 'purple',
            trend: stats.monthDeltaPct,
          },
        ].map((card, idx) => {
          const palette: Record<string, { iconBg: string; halo: string; text: string }> = {
            blue: {
              iconBg: 'from-apple-blue-500/20 to-apple-blue-600/20 border-apple-blue-500/30 text-apple-blue-200',
              halo: 'from-apple-blue-500/20 via-apple-indigo-500/10 to-apple-blue-600/10',
              text: 'text-apple-blue-200',
            },
            green: {
              iconBg: 'from-apple-green-500/20 to-emerald-500/20 border-apple-green-500/30 text-apple-green-200',
              halo: 'from-apple-green-500/15 via-emerald-500/10 to-apple-green-600/10',
              text: 'text-apple-green-200',
            },
            teal: {
              iconBg: 'from-teal-400/20 to-emerald-500/20 border-emerald-400/30 text-emerald-200',
              halo: 'from-emerald-400/20 via-teal-400/10 to-emerald-600/10',
              text: 'text-emerald-200',
            },
            purple: {
              iconBg: 'from-purple-500/20 to-indigo-500/20 border-purple-400/30 text-purple-200',
              halo: 'from-purple-500/20 via-indigo-500/10 to-blue-600/10',
              text: 'text-purple-200',
            },
          };
          const tone = palette[card.color];
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.07, ease: 'easeOut' }}
              className="relative overflow-hidden glass-card hover:shadow-apple-lg transition-all duration-300 border border-white/10"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tone.halo} opacity-50 blur-3xl pointer-events-none`} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="apple-caption text-apple-gray-400">{card.title}</p>
                  <p className="apple-h2 text-white">{card.value}</p>
                  <p className="apple-caption text-apple-gray-500 capitalize">{card.subtitle}</p>
                  {card.trend !== undefined && card.trend !== null && Number.isFinite(card.trend) && (
                    <span
                      className={[
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-apple-caption2 font-semibold border',
                        card.trend >= 0
                          ? 'bg-apple-green-500/15 text-apple-green-200 border-apple-green-400/40'
                          : 'bg-apple-red-500/15 text-apple-red-200 border-apple-red-400/40',
                      ].join(' ')}
                      title="Comparado con el mes anterior"
                    >
                      {card.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(card.trend).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className={`p-3 rounded-apple bg-gradient-to-br ${tone.iconBg} border`}>
                  <card.icon size={18} className={tone.text} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Tabla */}
      <section className="glass-card mb-10 overflow-auto">
        {isLoading ? (
          <div className="p-6 apple-body text-apple-gray-300">Cargando ventas pendientes…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 apple-body text-apple-gray-300">No hay ventas pendientes en el rango.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-apple-gray-300 border-b border-white/10">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Asesor(a)</th>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-left">Sucursal</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Ticket</th>
                <th className="px-3 py-2 text-left">Nota</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => {
                const ticketVal = ticketById[r.id] ?? r.approval_ticket ?? '';
                const noteVal = noteById[r.id] ?? r.approval_note ?? '';
                const total = Number(r.quantity || 0) * Number(r.unit_price || 0);
                return (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2">{r.sale_date?.slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="pill text-xs"><User size={12} /> {r.seller_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.product_name}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 text-xs text-apple-gray-200">
                        <MapPin size={12} /> {r.branch || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{r.quantity}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{fmtBs(total)}</td>
                    <td className="px-3 py-2 text-xs text-apple-gray-200">
                      <div>{r.customer_name || '—'}</div>
                      {r.customer_phone && <div className="text-apple-gray-400">{r.customer_phone}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={ticketVal}
                        onChange={(e) => setTicketById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Ticket / folio"
                        className="field-sm w-[160px]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={noteVal}
                        onChange={(e) => setNoteById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Nota para el registro"
                        className="field-sm w-[180px]"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => updateStatus(r.id, 'approved')}
                          disabled={!!actioning}
                          className="btn-primary btn-sm flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Aprobar
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'rejected')}
                          disabled={!!actioning}
                          className="btn-secondary btn-sm flex items-center gap-1"
                        >
                          <XCircle size={14} /> Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
