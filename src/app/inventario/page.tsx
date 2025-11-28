'use client';

import { useMemo } from 'react';
import {
  Sparkles,
  Package,
  AlertTriangle,
  ArrowLeftRight,
  RefreshCcw,
  Truck,
} from 'lucide-react';
import { useDemoOps } from '@/lib/demo/state';
import { demoInventory } from '@/lib/demo/mockData';
import { SectionCard } from '@/components/ui/SectionCard';

const MOVEMENTS = demoInventory.movements;

type InventoryItem = ReturnType<typeof useDemoOps>['inventory'][number];

type InventoryAlert = {
  level: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  action?: string;
};

type Movement = (typeof MOVEMENTS)[number];

type InventoryMetrics = {
  totalUnits: number;
  totalValue: number;
  avgRotation: number;
  bestBranch: string;
  movementsToday: number;
  entriesToday: number;
  exitsToday: number;
  branches: { branch: string; value: number; coverage: number; critical: number }[];
};

export default function InventarioPage() {
  const snapshot = useDemoOps();
  const stock = snapshot.inventory;

  const metrics = useMemo(() => buildMetrics(stock, MOVEMENTS), [stock]);
  const lowStock = useMemo(() => buildLowStockList(stock), [stock]);
  const slowMovers = useMemo(() => buildSlowMovers(stock), [stock]);
  const alerts = useMemo(() => buildAlerts(metrics, lowStock, slowMovers), [metrics, lowStock, slowMovers]);

  return (
    <div className="space-y-8">
      <section className="glass-card relative overflow-hidden p-5 lg:p-7">
        <div className="absolute inset-0 bg-gradient-to-r from-apple-blue-500/25 via-transparent to-apple-green-500/25 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-apple-gray-100">
                <Sparkles size={14} />
                <span>Inventory Ops</span>
              </div>
              <h1 className="apple-h1 text-white mt-3">Inventario inteligente</h1>
              <p className="apple-body text-apple-gray-300 max-w-3xl">
                Panel ejecutivo con visibilidad en tiempo real: cobertura por sucursal, alertas de reposición y movimientos kardex
                listos para accionar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary btn-sm">
                <RefreshCcw size={14} />
                Sincronizar ERP
              </button>
              <button className="btn-primary btn-sm">
                <Truck size={14} />
                Programar traslado
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <KpiCard label="Stock total" value={`${metrics.totalUnits.toLocaleString('es-BO')} uds`} helper={money(metrics.totalValue)} />
            <KpiCard label="Productos críticos" value={`${lowStock.length}`} helper="Por debajo del punto de pedido" tone="orange" />
            <KpiCard label="Rotación promedio" value={`${metrics.avgRotation} días`} helper={`Top sucursal: ${metrics.bestBranch}`} tone="green" />
            <KpiCard label="Movimientos hoy" value={`${metrics.movementsToday}`} helper={`${metrics.entriesToday} entradas · ${metrics.exitsToday} salidas`} tone="blue" />
          </div>
        </div>
      </section>

      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      <section className="grid gap-4 lg:grid-cols-3">
        <InsightCard
          title="Cobertura por sucursal"
          description="Top 3 sucursales con mejor cobertura y valor en stock."
          items={metrics.branches.slice(0, 3).map((branch) => ({
            title: branch.branch,
            value: `${branch.coverage} días · ${money(branch.value)}`,
            helper: branch.critical > 0 ? `${branch.critical} críticos` : 'Sin alertas',
          }))}
        />
        <InsightCard
          title="Reposición inmediata"
          description="Productos que deben reponerse hoy para no frenar ventas."
          items={lowStock.slice(0, 4).map((item) => {
            const reorderPoint = item.reorderPoint ?? 8;
            const stock = item.stock ?? 0;
            return {
              title: item.name,
              value: `${stock} uds · ${item.branch}`,
              helper: `Pedido sugerido: +${reorderPoint - stock} uds`,
            };
          })}
        />
        <InsightCard
          title="Lentos vs acelerados"
          description="Identifica rotación lenta vs rápida para ajustar compras."
          items={slowMovers.slice(0, 4).map((item) => ({
            title: item.name,
            value: `${item.rotationDays ?? '-'} días`,
            helper: item.stock > 0 ? `${item.stock} uds en ${item.branch}` : 'Sin stock',
          }))}
        />
      </section>

      <SectionCard
        icon={<Package size={18} className="text-apple-blue-300" />}
        title="Inventario por producto"
        description="Filtra y prioriza desde este tablero."
      >
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Sucursal</th>
                <th className="py-2 pr-4 text-right">Stock</th>
                <th className="py-2 pr-4 text-right">Punto pedido</th>
                <th className="py-2 pr-4 text-right">Rotación</th>
                <th className="py-2 pr-4 text-right">Cobertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stock.map((item) => (
                <tr key={item.id} className="text-white/90">
                  <td className="py-2 pr-4">
                    <div className="font-semibold text-white flex items-center gap-2">
                      {item.name}
                      {item.type === 'combo' && <span className="pill pill-blue text-[10px]">Combo</span>}
                    </div>
                    <p className="apple-caption text-apple-gray-500">{item.category || 'General'}</p>
                  </td>
                  <td className="py-2 pr-4 text-apple-gray-400">{item.sku}</td>
                  <td className="py-2 pr-4">{item.branch}</td>
                  <td className={`py-2 pr-4 text-right ${item.stock <= (item.reorderPoint ?? 8) ? 'text-apple-orange-300 font-semibold' : ''}`}>{item.stock} uds</td>
                  <td className="py-2 pr-4 text-right">{item.reorderPoint ?? 8}</td>
                  <td className="py-2 pr-4 text-right">{item.rotationDays ?? '—'} días</td>
                  <td className="py-2 pr-4 text-right">{estimateCoverage(item)} días</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        icon={<ArrowLeftRight size={18} className="text-apple-green-300" />}
        title="Movimientos recientes (Kardex)"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {MOVEMENTS.map((movement) => (
            <MovementCard key={movement.id} movement={movement} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function buildMetrics(stock: InventoryItem[], movements: Movement[]): InventoryMetrics {
  const totalUnits = stock.reduce((sum, item) => sum + Number(item.stock ?? 0), 0);
  const totalValue = stock.reduce((sum, item) => sum + Number(item.stock ?? 0) * Number(item.cost ?? item.price ?? 0), 0);
  const rotations = stock.map((item) => item.rotationDays ?? 0).filter(Boolean);
  const avgRotation = rotations.length ? Math.round(rotations.reduce((a, b) => a + b, 0) / rotations.length) : 0;
  const branchesMap = new Map<string, { value: number; coverage: number; critical: number }>();
  const branchCounts = new Map<string, number>();
  stock.forEach((item) => {
    const branch = item.branch || 'Principal';
    const bucket = branchesMap.get(branch) ?? { value: 0, coverage: 0, critical: 0 };
    bucket.value += Number(item.stock ?? 0) * Number(item.cost ?? 0);
    bucket.coverage += estimateCoverage(item);
    if ((item.stock ?? 0) <= (item.reorderPoint ?? 8)) bucket.critical += 1;
    branchesMap.set(branch, bucket);
    branchCounts.set(branch, (branchCounts.get(branch) ?? 0) + 1);
  });
  const branches = Array.from(branchesMap.entries()).map(([branch, data]) => ({
    branch,
    value: data.value,
    coverage: data.coverage ? Math.round(data.coverage / Math.max(branchCounts.get(branch) ?? 1, 1)) : 0,
    critical: data.critical,
  }));
  const sortedBranches = [...branches].sort((a, b) => b.coverage - a.coverage);
  const bestBranch = sortedBranches[0]?.branch ?? '—';
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMovements = movements.filter((m) => m.date === todayKey);
  const entriesToday = todayMovements.filter((m) => m.type === 'Entrada').reduce((sum, m) => sum + m.qty, 0);
  const exitsToday = todayMovements.filter((m) => m.type !== 'Entrada').reduce((sum, m) => sum + m.qty, 0);

  return {
    totalUnits,
    totalValue,
    avgRotation,
    bestBranch,
    movementsToday: todayMovements.length,
    entriesToday,
    exitsToday,
    branches: sortedBranches,
  };
}

function buildLowStockList(stock: InventoryItem[]) {
  return stock
    .filter((item) => Number(item.stock ?? 0) <= (item.reorderPoint ?? 8))
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
}

function buildSlowMovers(stock: InventoryItem[]) {
  return stock
    .filter((item) => (item.rotationDays ?? 0) >= 20)
    .sort((a, b) => (b.rotationDays ?? 0) - (a.rotationDays ?? 0));
}

function buildAlerts(metrics: InventoryMetrics, lowStock: InventoryItem[], slowMovers: InventoryItem[]): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];
  if (lowStock.length >= 3) {
    alerts.push({
      level: 'critical',
      title: 'Reposición urgente',
      detail: `${lowStock.slice(0, 3).map((item) => item.name).join(', ')} por debajo del punto de pedido.`,
      action: 'Confirma disponibilidad y crea traslado/orden de compra hoy.',
    });
  }
  if (metrics.avgRotation >= 25) {
    alerts.push({
      level: 'warning',
      title: 'Rotación lenta',
      detail: `Promedio de ${metrics.avgRotation} días. Evalúa descuentos o bundles.`,
      action: 'Integra estas referencias en campañas con ventas/marketing.',
    });
  }
  if (slowMovers.length >= 2) {
    alerts.push({
      level: 'info',
      title: 'Productos con riesgo de obsolescencia',
      detail: slowMovers.slice(0, 2).map((item) => item.name).join(', '),
      action: 'Ofrece combo o remarketing antes del cierre de mes.',
    });
  }
  return alerts;
}

function estimateCoverage(item: InventoryItem) {
  if (!item.rotationDays || !item.stock) return 0;
  return Math.max(1, Math.round(item.rotationDays));
}

function money(n: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(n || 0);
}

function KpiCard({
  label,
  value,
  helper,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'blue' | 'green' | 'orange';
}) {
  const palette: Record<typeof tone, string> = {
    blue: 'from-apple-blue-500/20 via-apple-blue-600/10 to-apple-blue-900/40 border-apple-blue-500/40',
    green: 'from-apple-green-500/20 via-apple-green-600/10 to-apple-green-900/40 border-apple-green-500/40',
    orange: 'from-apple-orange-500/20 via-apple-orange-600/10 to-apple-orange-900/40 border-apple-orange-500/40',
  };
  return (
    <div className="glass-card p-4 border bg-white/5 relative overflow-hidden">
      <div className={`pointer-events-none absolute inset-px rounded-[10px] bg-gradient-to-br ${palette[tone]}`} />
      <div className="relative z-10 space-y-1">
        <p className="apple-caption text-apple-gray-300">{label}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
        {helper && <p className="apple-caption text-apple-gray-500">{helper}</p>}
      </div>
    </div>
  );
}

function InsightCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: { title: string; value: string; helper?: string }[];
}) {
  return (
    <div className="glass-card p-4 sm:p-5 space-y-3">
      <div>
        <h3 className="apple-h4 text-white">{title}</h3>
        <p className="apple-caption text-apple-gray-400">{description}</p>
      </div>
      <ul className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <li key={item.title} className="rounded-apple border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-white font-semibold">{item.title}</div>
              <p className="apple-caption text-apple-gray-300">{item.value}</p>
              {item.helper && <p className="apple-caption text-apple-gray-500">{item.helper}</p>}
            </li>
          ))
        ) : (
          <li className="apple-caption text-apple-gray-500">Sin datos suficientes</li>
        )}
      </ul>
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: InventoryAlert[] }) {
  const palette: Record<InventoryAlert['level'], string> = {
    critical: 'border-apple-red-500/40 bg-apple-red-500/10 text-apple-red-50',
    warning: 'border-apple-orange-500/40 bg-apple-orange-500/10 text-apple-orange-50',
    info: 'border-apple-blue-500/30 bg-apple-blue-500/10 text-apple-blue-50',
  };
  return (
    <section className="glass-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-apple-red-300" />
        <h2 className="apple-h3 text-white">Alertas prioritarias</h2>
        <span className="pill pill-blue text-xs">{alerts.length}</span>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <div key={`${alert.title}-${idx}`} className={`rounded-apple border px-3 py-3 ${palette[alert.level]}`}>
            <div className="font-semibold text-white">{alert.title}</div>
            <p className="apple-caption text-white/80">{alert.detail}</p>
            {alert.action && <p className="apple-caption text-white/70 mt-1">{alert.action}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function MovementCard({ movement }: { movement: Movement }) {
  const isEntry = movement.type === 'Entrada';
  return (
    <div className="rounded-apple border border-white/10 bg-white/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-semibold">{movement.product}</p>
          <p className="apple-caption text-apple-gray-400">{movement.branch}</p>
        </div>
        <span className={`pill text-xs ${isEntry ? 'pill-blue' : 'bg-apple-orange-500/20 text-apple-orange-100 border border-apple-orange-500/40'}`}>
          {movement.type}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm text-apple-gray-300">
        <span>{movement.date}</span>
        <span>{movement.ref}</span>
        <span className="text-white font-semibold">{movement.qty} uds</span>
      </div>
    </div>
  );
}
