'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  TrendingUp,
  Phone,
  Mail,
  Filter,
  Tag,
  LineChart,
} from 'lucide-react';

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
  const [channelFilter, setChannelFilter] = useState('todos');
  const [segmentFilter, setSegmentFilter] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    channel: '',
    segment: '',
  });
  const [creating, setCreating] = useState(false);

  const { data, mutate } = useSWR<ListResponse>(
    `/endpoints/customers?q=${encodeURIComponent(search)}`,
    fetcher
  );

  const customers = data?.data ?? [];
  const channelOptions = useMemo(() => getUnique(customers, (c) => c.channel), [customers]);
  const segmentOptions = useMemo(() => getUnique(customers, (c) => c.segment), [customers]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return customers
      .filter((c) => {
        if (channelFilter !== 'todos' && c.channel !== channelFilter) return false;
        if (segmentFilter !== 'todos' && c.segment !== segmentFilter) return false;
        if (!needle) return true;
        return [c.name, c.email, c.phone, c.channel, c.segment]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .sort((a, b) => (b.ltv || 0) - (a.ltv || 0));
  }, [customers, search, channelFilter, segmentFilter]);

  const totals = useMemo(() => {
    const ltv = customers.reduce((sum, c) => sum + (c.ltv ?? 0), 0);
    const tickets = customers.reduce((sum, c) => sum + (c.orders_count ?? 0), 0);
    return { clients: customers.length, ltv, tickets };
  }, [customers]);

  const channelMix = useMemo(() => buildMix(customers, 'channel'), [customers]);
  const segmentMix = useMemo(() => buildMix(customers, 'segment').slice(0, 4), [customers]);
  const topAccounts = useMemo(() => filtered.slice(0, 6), [filtered]);
  const newCustomers = useMemo(
    () =>
      [...customers]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [customers]
  );

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
      setShowForm(false);
      await mutate();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-5 lg:p-7 overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-apple-blue-500/20 via-transparent to-apple-green-500/20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="apple-caption text-apple-gray-400 uppercase tracking-[0.2em]">
              Atlas CRM
            </p>
            <h1 className="apple-h1 text-white mt-2">Clientes & Relacionamiento</h1>
            <p className="apple-body text-apple-gray-300 max-w-2xl">
              Visualiza la salud de tu cartera, segmenta con un clic y dispara acciones de fidelización con el mismo estándar
              que esperarías de un CRM de primer nivel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/oportunidades" className="btn-secondary btn-sm">
              <Users size={16} />
              Ver pipeline
            </Link>
            <button
              onClick={() => setShowForm((prev) => !prev)}
              className="btn-primary btn-sm"
            >
              <UserPlus size={16} />
              {showForm ? 'Cerrar formulario' : 'Registrar cliente'}
            </button>
          </div>
        </div>
      </motion.header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Clientes activos" value={totals.clients} icon={<Users size={18} />} />
        <SummaryCard label="LTV total" value={money(totals.ltv)} icon={<TrendingUp size={18} />} tone="green" />
        <SummaryCard label="Pedidos acumulados" value={totals.tickets} icon={<LineChart size={18} />} tone="purple" />
      </section>

  <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-apple bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/15 flex items-center justify-center text-apple-blue-200">
              <Users size={18} />
            </div>
            <div>
              <h2 className="apple-h3 text-white">Explora tu base</h2>
              <p className="apple-caption text-apple-gray-400">
                Filtros inteligentes por canal, segmento o búsqueda libre.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, canal..."
                className="input-apple w-full pl-9"
              />
            </div>
            <div className="flex items-center gap-2 text-apple-gray-400 text-xs uppercase tracking-[0.2em]">
              <Filter size={12} />
              Filtros rápidos
            </div>
            <FilterSelect
              label="Canal"
              value={channelFilter}
              onChange={setChannelFilter}
              options={channelOptions}
            />
            <FilterSelect
              label="Segmento"
              value={segmentFilter}
              onChange={setSegmentFilter}
              options={segmentOptions}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {topAccounts.length ? (
                topAccounts.map((customer, index) => (
                  <CustomerCard key={customer.id} customer={customer} index={index} />
                ))
              ) : (
                <EmptyState
                  title="Sin clientes con filtros actuales"
                  subtitle="Ajusta la búsqueda para ver resultados"
                />
              )}
            </div>

            <InsightPanel title="Nuevos clientes" subtitle="Altas recientes">
              <div className="space-y-3">
                {newCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between border border-white/5 rounded-apple px-3 py-2 bg-white/5"
                  >
                    <div>
                      <p className="text-white font-medium">{customer.name}</p>
                      <p className="apple-caption text-apple-gray-400">
                        Alta {new Date(customer.created_at).toLocaleDateString('es-BO')}
                      </p>
                    </div>
                    <span className="text-apple-blue-300 text-sm">{money(customer.ltv)}</span>
                  </div>
                ))}
              </div>
            </InsightPanel>
          </div>

          <div className="space-y-4">
            <InsightPanel title="Mix por canal" subtitle="Ingresos acumulados">
              {channelMix.map((item) => (
                <MixBar key={item.label} {...item} />
              ))}
            </InsightPanel>

            <InsightPanel title="Segmentos clave" subtitle="Clientes activos">
              {segmentMix.map((item) => (
                <SegmentChip key={item.label} {...item} />
              ))}
            </InsightPanel>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="glass-card p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus size={16} className="text-apple-blue-300" />
                    <h3 className="apple-h4 text-white">Registrar cliente</h3>
                  </div>
                  <form onSubmit={handleCreate} className="space-y-3">
                    <InputField
                      label="Nombre"
                      value={form.name}
                      onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                      required
                    />
                    <InputField
                      label="Correo"
                      type="email"
                      value={form.email}
                      onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                    />
                    <InputField
                      label="Teléfono"
                      value={form.phone}
                      onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                    />
                    <InputField
                      label="Canal"
                      placeholder="Tienda, e-commerce, promotor..."
                      value={form.channel}
                      onChange={(value) => setForm((prev) => ({ ...prev, channel: value }))}
                    />
                    <InputField
                      label="Segmento"
                      placeholder="Retail, mayorista, VIP..."
                      value={form.segment}
                      onChange={(value) => setForm((prev) => ({ ...prev, segment: value }))}
                    />
                    <button className="btn-primary w-full" type="submit" disabled={creating}>
                      {creating ? 'Guardando...' : 'Crear cliente'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'blue' | 'green' | 'purple';
}) {
  const palette = {
    blue: 'from-apple-blue-500/20 to-apple-blue-900/30 border-apple-blue-500/40',
    green: 'from-apple-green-500/20 to-apple-green-900/30 border-apple-green-500/40',
    purple: 'from-purple-500/20 to-purple-900/30 border-purple-500/40',
  } as const;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass-card p-4 border bg-white/5 relative overflow-hidden"
    >
      <div className={`absolute inset-px rounded-[10px] bg-gradient-to-br ${palette[tone]}`} />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70">
          {icon}
        </div>
        <div>
          <p className="apple-caption text-apple-gray-300">{label}</p>
          <p className="apple-h3 text-white">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="flex flex-col">
      <span className="apple-caption text-apple-gray-400">{label}</span>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onChange('todos')}
          className={`px-3 py-1.5 text-sm rounded-apple border ${
            value === 'todos'
              ? 'border-white/40 bg-white/15 text-white'
              : 'border-white/10 text-apple-gray-400 hover:text-white'
          }`}
        >
          Todos
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`px-3 py-1.5 text-sm rounded-apple border ${
              value === option
                ? 'border-white/40 bg-white/15 text-white'
                : 'border-white/10 text-apple-gray-400 hover:text-white'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomerCard({ customer, index }: { customer: Customer; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card border border-white/10 p-4 space-y-3 hover:border-white/20 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-semibold text-lg">{customer.name}</p>
          <p className="apple-caption text-apple-gray-400">
            {customer.segment || 'Segmento sin definir'}
          </p>
        </div>
        {customer.channel && (
          <span className="px-3 py-1 text-xs rounded-full bg-apple-blue-500/15 border border-apple-blue-500/30 text-apple-blue-200">
            {customer.channel}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-apple-gray-300">
        <InfoRow icon={<Mail size={14} />} value={customer.email || 'Sin correo'} />
        <InfoRow icon={<Phone size={14} />} value={customer.phone || 'Sin teléfono'} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="apple-caption text-apple-gray-400">LTV</p>
          <p className="text-white font-semibold">{money(customer.ltv || 0)}</p>
        </div>
        <div>
          <p className="apple-caption text-apple-gray-400">Pedidos</p>
          <p className="text-white font-semibold">{customer.orders_count || 0}</p>
        </div>
        <div className="text-right">
          <p className="apple-caption text-apple-gray-400">Última compra</p>
          <p className="text-white font-semibold">
            {customer.last_order_at
              ? new Date(customer.last_order_at).toLocaleDateString('es-BO')
              : '—'}
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Link
          href={`/oportunidades?customer=${customer.id}`}
          className="text-apple-blue-300 text-sm hover:text-apple-blue-100 transition"
        >
          Abrir oportunidades →
        </Link>
      </div>
    </motion.div>
  );
}

function InsightPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card border border-white/10 p-4 space-y-2">
      <div>
        <p className="apple-caption text-apple-gray-400 uppercase tracking-[0.2em]">{subtitle}</p>
        <h3 className="apple-h4 text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MixBar({
  label,
  value,
  share,
}: {
  label: string;
  value: number;
  share: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-white">{label}</span>
        <span className="apple-caption text-apple-gray-400">{money(value)}</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-1">
        <div
          className="h-full bg-gradient-to-r from-apple-blue-500 to-apple-green-500"
          style={{ width: `${Math.min(share, 100)}%` }}
        />
      </div>
      <p className="apple-caption text-apple-gray-500 mt-1">{share.toFixed(1)}% del total</p>
    </div>
  );
}

function SegmentChip({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border border-white/10 rounded-apple bg-white/5">
      <div className="flex items-center gap-2 text-white">
        <Tag size={14} className="text-apple-purple-300" />
        {label}
      </div>
      <span className="apple-caption text-apple-gray-400">{count} clientes</span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2 block">
      <span className="apple-caption text-apple-gray-400">{label}</span>
      <input
        type={type}
        className="input-apple w-full"
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-apple-gray-300 text-sm">
      <span className="text-apple-gray-500">{icon}</span>
      {value}
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center py-10 px-4 border border-dashed border-white/10 rounded-apple bg-white/5">
      <p className="apple-h4 text-white mb-1">{title}</p>
      {subtitle && <p className="apple-caption text-apple-gray-400">{subtitle}</p>}
    </div>
  );
}

function getUnique(list: Customer[], selector: (c: Customer) => string | null) {
  const set = new Set<string>();
  list.forEach((customer) => {
    const value = selector(customer);
    if (value) set.add(value);
  });
  return Array.from(set);
}

function buildMix(
  list: Customer[],
  key: 'channel' | 'segment'
): { label: string; value: number; share: number }[] {
  const map = new Map<string, number>();
  list.forEach((customer) => {
    const label = (customer[key] || 'Sin dato') as string;
    map.set(label, (map.get(label) ?? 0) + (customer.ltv || 0));
  });
  const total = Array.from(map.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value,
      share: total ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function money(n: number) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 0,
  }).format(n || 0);
}
