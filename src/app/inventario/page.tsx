'use client';

import { Package, RefreshCcw, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { demoInventory } from '@/lib/demo/mockData';
import { useDemoOps } from '@/lib/demo/state';

export default function InventarioPage() {
  const snapshot = useDemoOps();
  const stock = snapshot.inventory;
  const movimientos = demoInventory.movements; // placeholder, no impact from ventas aún

  const stockTotal = stock.reduce((sum, p) => sum + p.stock, 0);
  const criticos = stock.filter((p) => p.stock < 10).length;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Inventario</h1>
        <p className="apple-body text-apple-gray-400">
          Controla el stock por producto y consulta movimientos tipo kardex.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={<Package size={18} />} label="Stock total" value={stockTotal} tone="blue" />
        <Kpi icon={<AlertTriangle size={18} />} label="Críticos" value={criticos} tone="orange" />
        <Kpi icon={<ArrowLeftRight size={18} />} label="Movimientos hoy" value={movimientos.length} tone="green" />
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="apple-h3 text-white">Stock por producto</h2>
          <button className="btn-secondary flex items-center gap-2">
            <RefreshCcw size={14} /> Actualizar
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Sucursal</th>
                <th className="py-2 pr-4 text-right">Stock</th>
                <th className="py-2 pr-4 text-right">Rotación (días)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stock.map((p) => (
                <tr key={p.id} className="text-white/90">
                  <td className="py-2 pr-4 font-semibold">{p.name}</td>
                  <td className="py-2 pr-4 text-apple-gray-400">{p.sku}</td>
                  <td className="py-2 pr-4">{p.branch}</td>
                  <td className="py-2 pr-4 text-right">{p.stock}</td>
                  <td className="py-2 pr-4 text-right">{p.rotationDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <h2 className="apple-h3 text-white">Movimientos recientes (Kardex)</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Referencia</th>
                <th className="py-2 pr-4">Sucursal</th>
                <th className="py-2 pr-4 text-right">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {movimientos.map((m) => (
                <tr key={m.id} className="text-white/90">
                  <td className="py-2 pr-4">{m.date}</td>
                  <td className="py-2 pr-4 font-medium">{m.product}</td>
                  <td className="py-2 pr-4">{m.type}</td>
                  <td className="py-2 pr-4 text-apple-gray-400">{m.ref}</td>
                  <td className="py-2 pr-4">{m.branch}</td>
                  <td className="py-2 pr-4 text-right">{m.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'orange';
}) {
  const colorMap: Record<typeof tone, string> = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
  };
  return (
    <div className="glass-card p-4 border bg-white/5 hover:shadow-apple-lg transition-all duration-300">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-apple border bg-gradient-to-br ${colorMap[tone]}`}>
        {icon}
      </div>
      <div className="mt-3">
        <p className="apple-caption text-apple-gray-400">{label}</p>
        <p className="apple-h3 text-white">{value}</p>
      </div>
    </div>
  );
}
