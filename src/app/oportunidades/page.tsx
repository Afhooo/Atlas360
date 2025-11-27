'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Filter,
  Plus,
  DollarSign,
  Trophy,
  Clock3,
  CheckCircle,
  Tag,
  User,
} from 'lucide-react';

type Opportunity = {
  id: string;
  customer_id: string | null;
  title: string | null;
  description: string | null;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  probability: number | null;
  close_date: string | null;
  customers?: { name?: string | null } | null;
};

type CustomerLite = { id: string; name: string };

const fetcher = (u: string) => fetch(u, { cache: 'no-store' }).then((r) => r.json());

const STAGES: { id: string; label: string }[] = [
  { id: 'LEAD', label: 'Lead' },
  { id: 'CALIFICADO', label: 'Calificado' },
  { id: 'PROPUESTA', label: 'Propuesta' },
  { id: 'GANADO', label: 'Ganado' },
  { id: 'PERDIDO', label: 'Perdido' },
];

export default function OportunidadesPage() {
  const [stageFilter, setStageFilter] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ title: string; customer_id: string; amount: string; stage: string }>({
    title: '',
    customer_id: '',
    amount: '',
    stage: 'LEAD',
  });

  const { data: oppResp, mutate } = useSWR<{ ok: boolean; data: Opportunity[] }>(
    `/endpoints/opportunities${stageFilter ? `?stage=${stageFilter}` : ''}`,
    fetcher
  );
  const { data: customersResp } = useSWR<{ ok: boolean; data: any[] }>('/endpoints/customers?pageSize=100', fetcher);

  const opportunities = oppResp?.data ?? [];
  const [localOpps, setLocalOpps] = useState<Opportunity[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  // Si vienen nuevos datos del server y no estamos arrastrando, reseteamos override local
  useEffect(() => {
    if (!draggingId) {
      setLocalOpps(null);
    }
  }, [opportunities, draggingId]);

  const effectiveOpps = localOpps ?? opportunities;
  const customers: CustomerLite[] =
    customersResp?.data?.map((c) => ({ id: c.id, name: c.name })) ?? [];

  const grouped = useMemo(() => {
    const map: Record<string, Opportunity[]> = {};
    STAGES.forEach((s) => (map[s.id] = []));
    effectiveOpps.forEach((o) => {
      const key = (o.stage || 'LEAD').toUpperCase();
      if (!map[key]) map[key] = [];
      map[key].push(o);
    });
    return map;
  }, [effectiveOpps]);

  const metrics = useMemo(() => {
    const totalValue = effectiveOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    const wonValue = (grouped['GANADO'] || []).reduce((sum, opp) => sum + (opp.amount || 0), 0);
    const lostValue = (grouped['PERDIDO'] || []).reduce((sum, opp) => sum + (opp.amount || 0), 0);
    const activeDeals = effectiveOpps.filter(
      (opp) => opp.stage && !['GANADO', 'PERDIDO'].includes(opp.stage)
    );

    return {
      pipelineValue: totalValue,
      winRate: totalValue ? (wonValue / totalValue) * 100 : 0,
      lossRate: totalValue ? (lostValue / Math.max(totalValue, 1)) * 100 : 0,
      activeDeals: activeDeals.length,
      avgTicket: activeDeals.length ? totalValue / activeDeals.length : 0,
    };
  }, [effectiveOpps, grouped]);

  const stageHealth = useMemo(
    () =>
      STAGES.map((stage) => {
        const list = grouped[stage.id] || [];
        const value = list.reduce((sum, opp) => sum + (opp.amount || 0), 0);
        return { ...stage, count: list.length, value };
      }),
    [grouped]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await fetch('/endpoints/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          customer_id: form.customer_id || null,
          amount: form.amount ? Number(form.amount) : null,
          stage: form.stage,
        }),
      });
      setForm({ title: '', customer_id: '', amount: '', stage: 'LEAD' });
      await mutate();
    } finally {
      setCreating(false);
    }
  };

  const applyStageLocal = (id: string, stage: string) => {
    setLocalOpps((prev) => {
      const base = prev ?? opportunities;
      return base.map((o) =>
        o.id === id
          ? {
              ...o,
              stage: stage.toUpperCase(),
            }
          : o
      );
    });
  };

  const handleStageChange = async (id: string, stage: string) => {
    const nextStage = stage.toUpperCase();
    applyStageLocal(id, nextStage);

    try {
      await fetch(`/endpoints/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: nextStage }),
      });
      await mutate();
    } catch (err) {
      console.error('Error actualizando etapa', err);
      setLocalOpps(null);
    } finally {
      setDraggingId(null);
      setHoverStage(null);
    }
  };

  const handleDropOnStage = (stageId: string) => {
    if (!draggingId) return;
    handleStageChange(draggingId, stageId);
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleSelect = (opp: Opportunity) => {
    setSelectedOpp(opp);
  };

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-5 lg:p-7 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-apple-blue-500/20 via-transparent to-apple-green-500/20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="apple-caption text-apple-gray-400 uppercase tracking-[0.2em]">
              Atlas CRM
            </p>
            <h1 className="apple-h1 text-white mt-2">Pipeline de oportunidades</h1>
            <p className="apple-body text-apple-gray-300 max-w-3xl">
              Prioriza leads, arrastra oportunidades entre etapas y visualiza la salud del pipeline con la misma precisión de un
              CRM enterprise.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary btn-sm flex items-center gap-2"
              onClick={() => setShowComposer((prev) => !prev)}
            >
              <Plus size={16} />
              {showComposer ? 'Cerrar creador' : 'Nueva oportunidad'}
            </button>
          </div>
        </div>
      </motion.header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Valor en pipeline"
          value={money(metrics.pipelineValue)}
          sub={`${metrics.activeDeals} negocios activos`}
          icon={<DollarSign size={18} />}
        />
        <MetricCard
          label="Win rate proyectado"
          value={`${metrics.winRate.toFixed(1)}%`}
          sub={`${metrics.lossRate.toFixed(1)}% lost rate`}
          icon={<Trophy size={18} />}
          tone="green"
        />
        <MetricCard
          label="Ticket promedio"
          value={money(metrics.avgTicket)}
          sub="Calculado sobre deals activos"
          icon={<CheckCircle size={18} />}
          tone="purple"
        />
        <MetricCard
          label="Ciclo estimado"
          value="27 días"
          sub="De lead a ganado"
          icon={<Clock3 size={18} />}
          tone="orange"
        />
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-apple bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/15 flex items-center justify-center text-apple-blue-200">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="apple-h3 text-white">Salud del pipeline</h2>
              <p className="apple-caption text-apple-gray-400">
                Etapas dinámicas con drag & drop, creación rápida y filtros avanzados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-apple-gray-400" />
            <select
              className="input-apple"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">Todas las etapas</option>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {stageHealth.map((stage) => (
            <StageChip key={stage.id} stage={stage} />
          ))}
        </div>
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="apple-h3 text-white">Kanban interactivo</h2>
          <p className="apple-caption text-apple-gray-500">
            Arrastra oportunidades para cambiar de etapa
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((stage) => {
            const cards = grouped[stage.id] || [];
            return (
              <div
                key={stage.id}
                className={`rounded-apple border ${
                  hoverStage === stage.id ? 'border-apple-blue-400' : 'border-white/10'
                } bg-white/5 flex flex-col`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHoverStage(stage.id);
                }}
                onDragLeave={() => setHoverStage(null)}
                onDrop={() => handleDropOnStage(stage.id)}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <div>
                    <p className="apple-caption text-apple-gray-400 uppercase tracking-[0.3em] text-xs">
                      {stage.label}
                    </p>
                    <p className="apple-body text-white font-semibold">
                      {cards.length} deals
                    </p>
                  </div>
                  <span className="apple-caption text-apple-gray-400">
                    {money(cards.reduce((sum, opp) => sum + (opp.amount || 0), 0))}
                  </span>
                </div>
                <div className="flex-1 space-y-3 p-3 max-h-[28rem] overflow-auto">
                  {cards.length ? (
                    cards.map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        onDragStart={handleDragStart}
                        onSelect={handleSelect}
                      />
                    ))
                  ) : (
                    <div className="apple-caption text-center text-apple-gray-500 py-6">
                      Sin oportunidades
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <AnimatePresence>
        {showComposer && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card p-4 sm:p-6 space-y-4 border border-white/10"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-apple-blue-300" />
              <h3 className="apple-h4 text-white">Nueva oportunidad</h3>
            </div>
            <form className="grid gap-4 sm:grid-cols-4" onSubmit={handleCreate}>
              <label className="space-y-2 sm:col-span-2">
                <span className="apple-caption text-apple-gray-400">Título</span>
                <input
                  className="input-apple w-full"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="apple-caption text-apple-gray-400">Cliente</span>
                <select
                  className="input-apple w-full"
                  value={form.customer_id}
                  onChange={(e) => setForm((p) => ({ ...p, customer_id: e.target.value }))}
                >
                  <option value="">Sin cliente</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="apple-caption text-apple-gray-400">Monto estimado</span>
                <input
                  className="input-apple w-full"
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="apple-caption text-apple-gray-400">Etapa</span>
                <select
                  className="input-apple w-full"
                  value={form.stage}
                  onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value }))}
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-4 flex justify-end">
                <button className="btn-primary" type="submit" disabled={creating}>
                  {creating ? 'Guardando...' : 'Crear oportunidad'}
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

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

function MetricCard({
  label,
  value,
  sub,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  tone?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const palette = {
    blue: 'from-apple-blue-500/15 to-apple-blue-900/30 border-apple-blue-500/40',
    green: 'from-apple-green-500/15 to-apple-green-900/30 border-apple-green-500/40',
    purple: 'from-purple-500/15 to-purple-900/30 border-purple-500/35',
    orange: 'from-apple-orange-500/15 to-apple-orange-900/30 border-apple-orange-500/35',
  } as const;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass-card border bg-white/5 relative overflow-hidden p-4"
    >
      <div className={`absolute inset-px rounded-[10px] bg-gradient-to-br ${palette[tone]}`} />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-white/15 bg-black/20 text-white/80 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="apple-caption text-apple-gray-300">{label}</p>
          <p className="apple-h3 text-white">{value}</p>
          {sub && <p className="apple-caption text-apple-gray-400">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function StageChip({
  stage,
}: {
  stage: { id: string; label: string; count: number; value: number };
}) {
  return (
    <div className="border border-white/10 rounded-apple bg-white/5 p-3 flex items-center justify-between">
      <div>
        <p className="apple-caption text-apple-gray-400">{stage.label}</p>
        <p className="text-white font-semibold">{stage.count} deals</p>
      </div>
      <div className="text-right">
        <p className="apple-caption text-apple-gray-400">Valor</p>
        <p className="text-white font-semibold">{money(stage.value)}</p>
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  onDragStart,
  onSelect,
}: {
  opportunity: Opportunity;
  onDragStart: (id: string) => void;
  onSelect: (opp: Opportunity) => void;
}) {
  return (
    <motion.div
      layout
      draggable
      onDragStart={() => onDragStart(opportunity.id)}
      onClick={() => onSelect(opportunity)}
      className="border border-white/10 rounded-apple bg-white/10 p-3 space-y-2 cursor-pointer hover:border-white/30 transition"
    >
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold">{opportunity.title}</p>
        <span className="text-apple-blue-300 text-sm">{money(opportunity.amount || 0)}</span>
      </div>
      {opportunity.customers?.name && (
        <div className="flex items-center gap-1 text-apple-gray-300 text-sm">
          <User size={14} />
          {opportunity.customers.name}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-apple-gray-400">
        <span>
          Prob: {opportunity.probability ? `${opportunity.probability}%` : 'N/A'}
        </span>
        <span>
          Cierre:{' '}
          {opportunity.close_date
            ? new Date(opportunity.close_date).toLocaleDateString('es-BO')
            : 'Sin fecha'}
        </span>
      </div>
    </motion.div>
  );
}

function DetailPanel({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity | null;
  onClose: () => void;
}) {
  if (!opportunity) return null;
  return (
    <AnimatePresence>
      {opportunity && (
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className="fixed top-16 right-6 w-full max-w-sm glass-card border border-white/10 p-4 space-y-3 z-20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="apple-caption text-apple-gray-400 uppercase tracking-[0.2em]">Detalle</p>
              <p className="apple-h3 text-white">{opportunity.title}</p>
            </div>
            <button onClick={onClose} className="text-apple-gray-400 hover:text-white">
              ✕
            </button>
          </div>
          <div className="space-y-2 text-sm text-apple-gray-300">
            <p>
              <span className="text-apple-gray-500">Cliente:</span>{' '}
              {opportunity.customers?.name || '—'}
            </p>
            <p>
              <span className="text-apple-gray-500">Etapa:</span> {opportunity.stage}
            </p>
            <p>
              <span className="text-apple-gray-500">Monto:</span> {money(opportunity.amount || 0)}
            </p>
            <p>
              <span className="text-apple-gray-500">Probabilidad:</span>{' '}
              {opportunity.probability ? `${opportunity.probability}%` : '—'}
            </p>
            <p>
              <span className="text-apple-gray-500">Fecha prevista:</span>{' '}
              {opportunity.close_date
                ? new Date(opportunity.close_date).toLocaleDateString('es-BO')
                : 'Sin definir'}
            </p>
            {opportunity.description && (
              <p className="text-apple-gray-400">{opportunity.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1">Ver historial</button>
            <button className="btn-primary flex-1">Crear tarea</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
