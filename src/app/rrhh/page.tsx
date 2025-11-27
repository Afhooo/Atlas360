'use client';

import { MapPin, CalendarDays, Clock } from 'lucide-react';
import { demoAttendanceMarks } from '@/lib/demo/mockData';

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

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="text-apple-blue-300" size={20} />
          <div>
            <h2 className="apple-h3 text-white">Marcajes recientes</h2>
            <p className="apple-caption text-apple-gray-400">Entradas y salidas con ubicación</p>
          </div>
        </div>
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
      </section>

      <section className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="text-apple-blue-300" size={20} />
          <div>
            <h2 className="apple-h3 text-white">Mapa de asistencia</h2>
            <p className="apple-caption text-apple-gray-400">Placeholder listo para geolocalización</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 h-64 flex items-center justify-center text-apple-gray-500">
          Próximamente: mapa con pines de marcaje y validación de geocerca.
        </div>
      </section>
    </div>
  );
}
