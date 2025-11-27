'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';

type Wx = {
  city: string;
  tempC: number;
  condition: string;
  icon: string;
  rain1h: number;
  windKmh: number;
  risk?: 'Bajo'|'Medio'|'Alto';
};

export default function WeatherStrip(
  { data, updatedAt }: { data: Wx[]; updatedAt?: number }
) {
  const empty = !data || data.length === 0;

  return (
    <div className="relative">
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Operativa de hoy</h3>
          <div className="text-xs text-white/60">
            {updatedAt ? `Actualizado ${new Date(updatedAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}` : '—'}
          </div>
        </div>

        {empty ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Sin datos meteorológicos. Operación normal.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
            {data.map((c, i) => (
              <motion.div
                key={c.city}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .25, delay: i * 0.02 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 min-h-[180px] flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-white/80 font-semibold leading-tight">{c.city}</div>
                    <div className="text-xs text-white/50 capitalize">{c.condition}</div>
                  </div>
                  <RiskPill risk={c.risk ?? 'Bajo'} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-extrabold">{c.tempC}°C</div>
                  <Image
                    src={`https://openweathermap.org/img/wn/${c.icon}@2x.png`}
                    alt={c.condition}
                    width={40}
                    height={40}
                    className="w-9 h-9 opacity-90"
                    unoptimized
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                  <Metric label="Lluvia 1h" value={`${c.rain1h.toFixed(1)} mm`} />
                  <Metric label="Viento" value={`${c.windKmh} km/h`} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2 flex flex-col gap-1">
      <div className="opacity-70">{label}</div>
      <div className="font-semibold text-white">{value}</div>
    </div>
  );
}

function RiskPill({ risk }: { risk: 'Bajo'|'Medio'|'Alto' }) {
  const cfg = risk === 'Alto'
    ? { dot:'bg-red-400', text:'text-red-300', ring:'border-red-400/30' }
    : risk === 'Medio'
      ? { dot:'bg-amber-300', text:'text-amber-300', ring:'border-amber-300/30' }
      : { dot:'bg-emerald-300', text:'text-emerald-300', ring:'border-emerald-300/30' };

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${cfg.ring} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      Riesgo {risk}
    </div>
  );
}
