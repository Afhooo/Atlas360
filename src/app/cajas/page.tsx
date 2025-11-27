'use client';

import { CheckCircle2, AlertTriangle, CircleDollarSign } from 'lucide-react';
import { demoCajas } from '@/lib/demo/mockData';
import { useDemoOps } from '@/lib/demo/state';

export default function CajasPage() {
  const snapshot = useDemoOps();
  const cierres = demoCajas.map((c, idx) =>
    idx === 0
      ? { ...c, declarado: snapshot.cash, sistema: snapshot.cash, estado: 'Cuadrado', diferencias: 0 }
      : c
  );
  const cuadradas = cierres.filter((c) => c.estado === 'Cuadrado').length;
  const pendientes = cierres.length - cuadradas;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Cajas y Cuadraturas</h1>
        <p className="apple-body text-apple-gray-400">
          Aperturas y cierres diarios con estado de cuadratura.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={<CheckCircle2 size={18} />} label="Cuadradas" value={cuadradas} tone="green" />
        <Kpi icon={<AlertTriangle size={18} />} label="Con diferencia" value={pendientes} tone="orange" />
        <Kpi icon={<CircleDollarSign size={18} />} label="Cierres revisados" value={cierres.length} tone="blue" />
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <h2 className="apple-h3 text-white">Cierres recientes</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Sucursal</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4 text-right">Declarado</th>
                <th className="py-2 pr-4 text-right">Sistema</th>
                <th className="py-2 pr-4 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cierres.map((c) => (
                <tr key={c.id} className="text-white/90">
                  <td className="py-2 pr-4">{c.fecha}</td>
                  <td className="py-2 pr-4">{c.local}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        c.estado === 'Cuadrado'
                          ? 'bg-apple-green-500/20 text-apple-green-200'
                          : 'bg-apple-orange-500/20 text-apple-orange-200'
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right">{money(c.declarado)}</td>
                  <td className="py-2 pr-4 text-right">{money(c.sistema)}</td>
                  <td className={`py-2 pr-4 text-right ${c.diferencias === 0 ? 'text-apple-gray-300' : 'text-apple-orange-300'}`}>
                    {money(c.diferencias)}
                  </td>
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
