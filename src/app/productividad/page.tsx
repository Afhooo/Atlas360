'use client';

import { Activity, BarChart3 } from 'lucide-react';
import { demoProductividad } from '@/lib/demo/mockData';

export default function ProductividadPage() {
  const kpis = demoProductividad.kpis;
  const resumen = demoProductividad.resumen;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Productividad</h1>
        <p className="apple-body text-apple-gray-400">
          Horas efectivas, tickets y tareas por persona y local.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <Kpi key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-apple-blue-300" size={20} />
          <div>
            <h2 className="apple-h3 text-white">Resumen por persona</h2>
            <p className="apple-caption text-apple-gray-400">Horas y productividad individual</p>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Persona</th>
                <th className="py-2 pr-4 text-right">Horas</th>
                <th className="py-2 pr-4 text-right">Ventas</th>
                <th className="py-2 pr-4 text-right">Tareas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {resumen.map((row) => (
                <tr key={row.person} className="text-white/90">
                  <td className="py-2 pr-4 font-semibold">{row.person}</td>
                  <td className="py-2 pr-4 text-right">{row.horas.toFixed(1)}</td>
                  <td className="py-2 pr-4 text-right">{row.ventas}</td>
                  <td className="py-2 pr-4 text-right">{row.tareas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4 border bg-white/5 hover:shadow-apple-lg transition-all duration-300">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-apple border bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/10 text-apple-blue-200">
        <Activity size={18} />
      </div>
      <div className="mt-3">
        <p className="apple-caption text-apple-gray-400">{label}</p>
        <p className="apple-h3 text-white">{value}</p>
      </div>
    </div>
  );
}
