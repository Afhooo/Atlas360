'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search } from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  channel: string | null;
  segment: string | null;
  created_at: string;
  ltv: number;
  orders_count: number;
  last_order_at: string | null;
};

type ListResponse = { ok: boolean; data: Customer[]; total: number };

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then((r) => r.json());

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', channel: '', segment: '' });

  const { data, mutate } = useSWR<ListResponse>(
    `/endpoints/customers?q=${encodeURIComponent(search)}`,
    fetcher
  );

  const list = data?.data ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await fetch('/endpoints/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ name: '', email: '', phone: '', channel: '', segment: '' });
      await mutate();
    } finally {
      setCreating(false);
    }
  };

  const totalLtv = list.reduce((sum, c) => sum + (c.ltv ?? 0), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="apple-h1 text-white">Clientes</h1>
          <p className="apple-body text-apple-gray-400">
            Vista 360 de tus clientes: valor de vida, compras y pipeline.
          </p>
        </div>
        <Link
          href="/oportunidades"
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Users size={16} />
          Ver pipeline
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Clientes" value={list.length} accent="blue" />
        <Kpi label="LTV total" value={money(totalLtv)} accent="green" />
        <Kpi label="Tickets totales" value={list.reduce((s, c) => s + (c.orders_count ?? 0), 0)} accent="purple" />
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-apple bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/15 flex items-center justify-center text-apple-blue-200">
              <Users size={18} />
            </div>
            <div>
              <h2 className="apple-h3 text-white">Listado de clientes</h2>
              <p className="apple-caption text-apple-gray-400">Segmenta por canal/segmento desde el buscador</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500"
            />
            <input
              className="input-apple w-full pl-9"
              placeholder="Buscar por nombre, email, canal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Contacto</th>
                <th className="py-2 pr-4">Canal</th>
                <th className="py-2 pr-4">Segmento</th>
                <th className="py-2 pr-4 text-right">LTV</th>
                <th className="py-2 pr-4 text-right">Pedidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.map((c) => (
                <tr key={c.id} className="text-white/90 hover:bg-white/5 transition-colors">
                  <td className="py-2 pr-4 font-semibold">
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      {c.last_order_at && (
                        <span className="apple-caption text-apple-gray-500">
                          Última compra: {new Date(c.last_order_at).toLocaleDateString('es-BO')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="text-apple-gray-200">{c.email || '—'}</div>
                    <div className="text-apple-gray-500 text-xs">{c.phone || ''}</div>
                  </td>
                  <td className="py-2 pr-4">
                    {c.channel ? <span className="pill-blue">{c.channel}</span> : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    {c.segment ? <span className="pill-purple">{c.segment}</span> : '—'}
                  </td>
                  <td className="py-2 pr-4 text-right">{money(c.ltv || 0)}</td>
                  <td className="py-2 pr-4 text-right">{c.orders_count || 0}</td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td className="py-4 text-apple-gray-500" colSpan={6}>
                    No hay clientes aún. Crea el primero a la derecha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-apple-blue-300" />
          <h2 className="apple-h3 text-white">Nuevo cliente</h2>
        </div>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleCreate}
        >
          <label className="space-y-2 sm:col-span-2">
            <span className="apple-caption text-apple-gray-400">Nombre</span>
            <input
              className="input-apple w-full"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Correo</span>
            <input
              className="input-apple w-full"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Teléfono</span>
            <input
              className="input-apple w-full"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Canal</span>
            <input
              className="input-apple w-full"
              placeholder="Tienda, e-commerce, promotor..."
              value={form.channel}
              onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Segmento</span>
            <input
              className="input-apple w-full"
              placeholder="Retail, mayorista, VIP..."
              value={form.segment}
              onChange={(e) => setForm((p) => ({ ...p, segment: e.target.value }))}
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button className="btn-primary flex items-center gap-2" type="submit" disabled={creating}>
              <UserPlus size={16} />
              {creating ? 'Creando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent = 'blue',
}: {
  label: string;
  value: string | number;
  accent?: 'blue' | 'green' | 'purple';
}) {
  const accentMap = {
    blue: 'from-apple-blue-500/20 via-apple-blue-600/10 to-apple-blue-900/40 border-apple-blue-500/40',
    green: 'from-apple-green-500/20 via-apple-green-600/10 to-apple-green-900/40 border-apple-green-500/40',
    purple: 'from-purple-500/20 via-purple-600/10 to-purple-900/40 border-purple-500/40',
  } as const;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass-card p-4 border bg-white/5 relative overflow-hidden"
    >
      <div
        className={`pointer-events-none absolute inset-px rounded-[10px] bg-gradient-to-br ${accentMap[accent]}`}
      />
      <div className="relative z-10">
        <p className="apple-caption text-apple-gray-300 mb-1">{label}</p>
        <p className="apple-h3 text-white">{value}</p>
      </div>
    </motion.div>
  );
}

function money(n: number) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 0,
  }).format(n || 0);
}
