'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { BarChart3, DollarSign, Package, ShoppingBag, Filter } from 'lucide-react';
import { demoSalesReport, demoSalesSummary } from '@/lib/demo/mockData';

const fetcher = async (u: string) => {
  const res = await fetch(u, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

type SaleRow = {
  order_id: string;
  order_no: number | null;
  order_date: string;
  branch: string | null;
  seller_full_name: string | null;
  product_name: string;
  quantity: number;
  subtotal: number;
  channel?: string;
};

export default function VentasPage() {
  const { data: salesReport } = useSWR<SaleRow[]>('/endpoints/sales-report', fetcher, {
    onError: () => undefined,
  });
  const { data: salesSummary } = useSWR<any[]>('/endpoints/sales-summary', fetcher, {
    onError: () => undefined,
  });

  const rows: SaleRow[] = (salesReport && Array.isArray(salesReport) ? salesReport : demoSalesReport).slice(0, 25);
  const total = rows.reduce((sum, r) => sum + Number(r.subtotal ?? 0), 0);
  const tickets = rows.length;
  const productos = rows.reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);
  const resumen = salesSummary && Array.isArray(salesSummary) && salesSummary.length ? salesSummary : demoSalesSummary;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Ventas</h1>
        <p className="apple-body text-apple-gray-400">
          Registra y analiza tus ventas con KPIs diarios y mensuales.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<DollarSign size={18} />} label="Total vendido" value={money(total)} tone="blue" />
        <KpiCard icon={<ShoppingBag size={18} />} label="Tickets" value={tickets} tone="green" />
        <KpiCard icon={<Package size={18} />} label="Productos" value={productos} tone="orange" />
        <KpiCard icon={<BarChart3 size={18} />} label="Promedio ticket" value={money(tickets ? total / tickets : 0)} tone="purple" />
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="apple-h3 text-white">Últimas ventas</h2>
            <p className="apple-caption text-apple-gray-400">Datos recientes por sucursal</p>
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter size={16} />
            Filtros
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Venta</th>
                <th className="py-2 pr-4">Vendedor</th>
                <th className="py-2 pr-4">Sucursal</th>
                <th className="py-2 pr-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.order_id} className="text-white/90">
                  <td className="py-2 pr-4">{format(new Date(row.order_date), 'dd/MM/yyyy')}</td>
                  <td className="py-2 pr-4">
                    <div className="font-semibold">{row.product_name}</div>
                    <div className="text-apple-gray-500 text-xs">#{row.order_no ?? row.order_id}</div>
                  </td>
                  <td className="py-2 pr-4">{row.seller_full_name || '—'}</td>
                  <td className="py-2 pr-4">{row.branch || 'Sin sucursal'}</td>
                  <td className="py-2 pl-4 text-right">{money(row.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <h2 className="apple-h3 text-white">Resumen mensual por sucursal</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Sucursal</th>
                <th className="py-2 pr-4 text-right">Ingresos</th>
                <th className="py-2 pr-4 text-right">Productos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {resumen.map((row) => (
                <tr key={`${row.summary_date}-${row.branch}`} className="text-white/90">
                  <td className="py-2 pr-4">{row.summary_date}</td>
                  <td className="py-2 pr-4">{row.branch}</td>
                  <td className="py-2 pr-4 text-right">{money(row.total_revenue)}</td>
                  <td className="py-2 pr-4 text-right">{row.total_products_sold ?? row.cantidad_productos ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function money(n: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 0 }).format(n || 0);
}

function KpiCard({
  icon,
  label,
  value,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colorMap: Record<typeof tone, string> = {
    blue: 'from-apple-blue-500/20 to-apple-blue-600/10 border-apple-blue-500/30 text-apple-blue-400',
    green: 'from-apple-green-500/20 to-apple-green-600/10 border-apple-green-500/30 text-apple-green-400',
    orange: 'from-apple-orange-500/20 to-apple-orange-600/10 border-apple-orange-500/30 text-apple-orange-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
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
