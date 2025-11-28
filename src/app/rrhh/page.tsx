'use client';

import { MapPin, CalendarDays, Clock } from 'lucide-react';
import { demoAttendanceMarks } from '@/lib/demo/mockData';
import { SectionCard } from '@/components/ui/SectionCard';

export default function RrhhPage() {
  const marks = demoAttendanceMarks;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">RRHH y Asistencia</h1>
        <p className="apple-body text-apple-gray-400">
          Control de marcajes, georreferencia y cumplimiento horario.
        </p>
      </header>

      <SectionCard
        icon={<CalendarDays className="text-apple-blue-300" size={20} />}
        title="Marcajes recientes"
        description="Entradas y salidas con ubicación"
      >
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Persona</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Hora</th>
                <th className="py-2 pr-4">Sucursal</th>
                <th className="py-2 pr-4">Georreferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {marks.map((m) => (
                <tr key={m.id} className="text-white/90">
                  <td className="py-2 pr-4 font-semibold">{m.person}</td>
                  <td className="py-2 pr-4">{m.type}</td>
                  <td className="py-2 pr-4">{m.time}</td>
                  <td className="py-2 pr-4">{m.site}</td>
                  <td className="py-2 pr-4 flex items-center gap-2">
                    <MapPin size={14} className="text-apple-green-400" />
                    <span>{m.geo}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Clock className="text-apple-blue-300" size={20} />}
        title="Mapa de asistencia"
        description="Placeholder listo para geolocalización"
      >
        <div className="rounded-2xl border border-white/10 bg-black/40 h-64 flex items-center justify-center text-apple-gray-500">
          Próximamente: mapa con pines de marcaje y validación de geocerca.
        </div>
      </SectionCard>
    </div>
  );
}
