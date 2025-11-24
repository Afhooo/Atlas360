'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, Clock3, Filter, Search, XCircle, Ticket, MapPin, User, Package } from 'lucide-react';

type SalesRow = {
  id: string;
  sale_date: string;
  created_at: string;
  promoter_name: string;
  origin: string;
  district?: string | null;
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
  full_name?: string | null;
  username?: string | null;
  role?: string | null;
};

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then((r) => r.json());
const iso = (d: Date) => d.toISOString().slice(0, 10);
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const fmtBs = (n: number) => `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ValidacionVentasPromotores() {
  const [from, setFrom] = useState(iso(startOfMonth()));
  const [to, setTo] = useState(iso(new Date()));
  const [q, setQ] = useState('');
  const [origin, setOrigin] = useState('');
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [ticketById, setTicketById] = useState<Record<string, string>>({});
  const [actioning, setActioning] = useState<string | null>(null);

  const { data: me } = useSWR<MeResp>('/endpoints/me', fetcher);

  const qs = new URLSearchParams({ from, to, q, status: 'pending' });
  const { data, mutate, isLoading } = useSWR<SalesResp>(`/endpoints/promoters/sales?${qs.toString()}`, fetcher);

  const rows = useMemo(() => {
    let list = data?.rows || [];
    if (origin) list = list.filter((r) => r.origin === origin);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((r) =>
        (r.promoter_name || '').toLowerCase().includes(needle) ||
        (r.product_name || '').toLowerCase().includes(needle) ||
        (r.customer_name || '').toLowerCase().includes(needle) ||
        (r.customer_phone || '').toLowerCase().includes(needle) ||
        (r.district || '').toLowerCase().includes(needle)
      );
    }
    return [...list].sort((a, b) => b.sale_date.localeCompare(a.sale_date));
  }, [data?.rows, origin, q]);

  const stats = useMemo(() => {
    const items = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const total = rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unit_price || 0), 0);
    return { count: rows.length, items, total };
  }, [rows]);

  const approver = me?.full_name || me?.username || 'Validador';

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !window.confirm('¿Rechazar esta venta?')) return;
    setActioning(`${id}-${status}`);
    try {
      const res = await fetch(`/endpoints/promoters/sales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          note: noteById[id],
          ticket: ticketById[id],
          approver,
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

  const isUnauthorized = me && String(me.role || '').toUpperCase() === 'PROMOTOR';

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
            <h1 className="apple-h1">Validación de ventas (Promotores)</h1>
            <p className="apple-caption text-apple-gray-300">Autoriza ventas pendientes antes de que entren al dashboard.</p>
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
            <label className="apple-caption text-apple-gray-400">Origen</label>
            <div className="flex items-center gap-2">
              <span className="pill"><Filter size={14} /></span>
              <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="field w-full">
                <option value="">Todos</option>
                <option value="cochabamba">Cochabamba</option>
                <option value="lapaz">La Paz</option>
                <option value="elalto">El Alto</option>
                <option value="santacruz">Santa Cruz</option>
                <option value="sucre">Sucre</option>
                <option value="encomienda">Encomienda</option>
                <option value="tienda">Tienda</option>
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
                placeholder="Promotor, producto, cliente, zona…"
                className="field w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="apple-caption text-apple-gray-400">Ventas pendientes</p>
            <p className="apple-h2 text-white">{stats.count}</p>
          </div>
          <Clock3 className="text-apple-blue-300" />
        </div>
        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="apple-caption text-apple-gray-400">Items</p>
            <p className="apple-h2 text-white">{stats.items}</p>
          </div>
          <Package className="text-apple-green-300" />
        </div>
        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="apple-caption text-apple-gray-400">Total Bs</p>
            <p className="apple-h2 text-emerald-300">{fmtBs(stats.total)}</p>
          </div>
          <Ticket className="text-emerald-300" />
        </div>
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
                <th className="px-3 py-2 text-left">Promotor</th>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-right">Cantidad</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Origen / Zona</th>
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
                        <span className="pill text-xs"><User size={12} /> {r.promoter_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.product_name}</td>
                    <td className="px-3 py-2 text-right">{r.quantity}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{fmtBs(total)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 text-xs text-apple-gray-200">
                        <MapPin size={12} /> {r.origin?.toUpperCase()}{r.district ? ` • ${r.district}` : ''}
                      </div>
                    </td>
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
