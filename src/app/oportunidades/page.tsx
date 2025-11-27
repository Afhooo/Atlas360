'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Activity, Filter, Plus } from 'lucide-react';

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

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Pipeline de oportunidades</h1>
        <p className="apple-body text-apple-gray-400">
          Visualiza el flujo desde lead hasta venta ganada.
        </p>
      </header>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-apple bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/15 flex items-center justify-center text-apple-blue-200">
              <Activity size={18} />
            </div>
            <div>
              <h2 className="apple-h3 text-white">Nueva oportunidad</h2>
              <p className="apple-caption text-apple-gray-400">Asocia un cliente y monto estimado</p>
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
            <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={creating}>
              <Plus size={16} />
              {creating ? 'Creando...' : 'Crear oportunidad'}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {STAGES.map((stage) => (
          <div
            key={stage.id}
            className={`glass-card p-3 sm:p-4 flex flex-col gap-3 min-h-[220px] transition-all duration-200 ${
              hoverStage === stage.id
                ? 'border-apple-blue-500/50 bg-gradient-to-b from-apple-blue-500/10 to-transparent'
                : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setHoverStage(stage.id);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (hoverStage === stage.id) setHoverStage(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnStage(stage.id);
            }}
          >
            <div className="flex items-center justify-between">
              <span className="apple-caption text-apple-gray-300 uppercase tracking-wide">
                {stage.label}
              </span>
              <span className="pill-soft">
                {grouped[stage.id]?.length ?? 0}
              </span>
            </div>
            <div className="space-y-3 overflow-auto">
              {(grouped[stage.id] || []).map((opp) => (
                <motion.article
                  key={opp.id}
                  layout
                  draggable
                  onDragStart={() => setDraggingId(opp.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setHoverStage(null);
                  }}
                  whileDrag={{
                    scale: 1.03,
                    boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
                  }}
                  className="rounded-apple border border-white/10 bg-white/[0.03] p-3 space-y-2 cursor-grab active:cursor-grabbing"
                >
                  <div className="apple-body text-white font-semibold">
                    {opp.title || 'Sin título'}
                  </div>
                  <div className="apple-caption text-apple-gray-400">
                    {opp.customers?.name || 'Sin cliente'}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="apple-caption text-apple-gray-300">
                      {money(opp.amount || 0)}
                    </span>
                    <select
                      className="apple-caption bg-transparent border border-white/15 rounded-apple px-2 py-1 text-apple-gray-300"
                      value={(opp.stage || 'LEAD').toUpperCase()}
                      onChange={(e) => handleStageChange(opp.id, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {opp.close_date && (
                    <div className="apple-caption text-apple-gray-500">
                      Cierre: {opp.close_date}
                    </div>
                  )}
                </motion.article>
              ))}
              {!grouped[stage.id]?.length && (
                <p className="apple-caption text-apple-gray-600 text-xs">Sin oportunidades</p>
              )}
            </div>
          </div>
        ))}
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
