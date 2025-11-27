'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, HelpCircle, MessageCircle, Sparkles, Package, DollarSign } from 'lucide-react';

type Faq = {
  q: string;
  a: string;
};

const sections: { title: string; faqs: Faq[] }[] = [
  {
    title: 'Primeros pasos',
    faqs: [
      { q: '¿Cómo ingreso al sistema?', a: 'Usa tu usuario/correo y la contraseña asignada. Si es tu primer acceso, el administrador puede resetearla en Configuración → Usuarios.' },
      { q: '¿Cómo cambio el tema claro/oscuro?', a: 'En la barra lateral, usa el switch de tema. El modo se recuerda en tu navegador.' },
      { q: '¿Cómo veo mis permisos?', a: 'Los módulos visibles dependen de tu rol (admin, gerente, vendedor, cajero, logística). Si necesitas más acceso, pide al administrador que te asigne el rol adecuado.' },
    ],
  },
  {
    title: 'Ventas',
    faqs: [
      { q: '¿Dónde registro una venta?', a: 'Ve a Ventas → Registrar venta. Completa cliente, productos y forma de pago. La caja y el inventario se actualizan al confirmar.' },
      { q: '¿Cómo veo mis ventas y tickets?', a: 'En Ventas (análisis) puedes filtrar por fecha, canal y vendedor. El dashboard muestra los KPIs del día y la semana.' },
      { q: '¿Cómo manejo devoluciones?', a: 'En Ventas → Devoluciones (o Acciones rápidas), selecciona la venta y el motivo. Se ajusta stock y caja según la política definida.' },
    ],
  },
  {
    title: 'Inventario',
    faqs: [
      { q: '¿Cómo reviso stock y críticos?', a: 'Inventario muestra stock por sucursal y críticos. Los productos bajo umbral se marcan para reposición.' },
      { q: '¿Qué es el Kardex?', a: 'El Kardex lista movimientos (entradas, salidas, ajustes, transferencias) con fecha, referencia y cantidades.' },
      { q: '¿Cómo transfiero entre sucursales?', a: 'En Inventario → Transferencias, selecciona origen, destino, producto y cantidad. El estado pasa a “en tránsito” hasta confirmar.' },
    ],
  },
  {
    title: 'Cajas y finanzas',
    faqs: [
      { q: '¿Dónde abro/cierro caja?', a: 'En Cajas puedes abrir turno, registrar ingresos/egresos y cerrar con arqueo. El dashboard muestra si hay diferencias.' },
      { q: '¿Cómo veo cuadraturas?', a: 'En el módulo Cajas consulta cierres, declarados vs. sistema y diferencias pendientes de aprobación.' },
      { q: '¿Qué pasa con devoluciones en caja?', a: 'Las devoluciones ajustan el saldo de caja según el medio de pago. Revisa los reportes de devoluciones en Cajas o Ventas.' },
    ],
  },
  {
    title: 'RRHH y asistencia',
    faqs: [
      { q: '¿Cómo marco asistencia?', a: 'En RRHH/Asistencia puedes marcar entrada/salida (con geolocalización si aplica). El resumen diario se refleja en el dashboard.' },
      { q: '¿Puedo ver mis marcajes?', a: 'Sí, en RRHH/Asistencia → Historial. El admin/gerente ve el consolidado por sucursal.' },
    ],
  },
  {
    title: 'IA: Atlas Copilot',
    faqs: [
      { q: '¿Qué puedo preguntarle?', a: 'KPIs de ventas, stock crítico, diferencias de caja, clientes top, pipeline y recomendaciones de acción. Siempre cita la falta de datos si aplica.' },
      { q: '¿Cómo usa mis datos?', a: 'Consulta los endpoints internos (ventas, inventario, cajas, clientes). Si no hay datos, te lo dirá y sugerirá qué medir.' },
      { q: '¿Quién lo puede usar?', a: 'Por defecto solo roles de jefatura (admin, coordinador, líder). Puedes cambiarlo en permisos y feature flags.' },
    ],
  },
  {
    title: 'Permisos y roles',
    faqs: [
      { q: '¿Cómo creo o edito usuarios?', a: 'Ve a Configuración → Usuarios. Puedes crear, editar, activar/desactivar y cambiar roles.' },
      { q: '¿Qué roles existen?', a: 'Administrador, Gerente, Vendedor, Cajero, Logística (y los que definas). Cada rol habilita módulos visibles en el sidebar.' },
      { q: '¿Cómo activo/desactivo módulos?', a: 'En permisos/feature flags (src/lib/config/featureFlags.ts) puedes encender/apagar módulos y ajustar quién los ve.' },
    ],
  },
];

const quickLinks = [
  { label: 'Guía de ventas', href: '/ventas', icon: <Sparkles size={14} /> },
  { label: 'Inventario', href: '/inventario', icon: <Package size={14} /> },
  { label: 'Cajas', href: '/cajas', icon: <DollarSign size={14} /> },
  { label: 'Usuarios y roles', href: '/configuracion/usuarios', icon: <HelpCircle size={14} /> },
  { label: 'Preguntar a Copilot', href: '/analisis', icon: <MessageCircle size={14} /> },
];

export default function AyudaPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((sec) => ({
        ...sec,
        faqs: sec.faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)),
      }))
      .filter((sec) => sec.faqs.length > 0);
  }, [query]);

  return (
    <div className="space-y-6">
      <header className="glass-card p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-apple-blue-400" />
          <div>
            <h1 className="apple-h1 text-white">Centro de ayuda</h1>
            <p className="apple-body text-apple-gray-400">FAQs rápidas y atajos a módulos clave.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-500" size={16} />
            <input
              className="input-apple pl-9 pr-3 py-2 text-[12px] bg-white/5 border-white/10"
              placeholder="Busca por palabra clave: ventas, caja, inventario, copilot..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-apple-caption text-white hover:border-white/20 hover:bg-white/10 transition-colors"
              >
                {link.icon}
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((section, idx) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx, duration: 0.35, ease: 'easeOut' }}
            className="glass-card p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="apple-h3 text-white">{section.title}</h2>
              <span className="apple-caption text-apple-gray-500">{section.faqs.length} preguntas</span>
            </div>
            <div className="space-y-3">
              {section.faqs.map((f, i) => (
                <details
                  key={f.q}
                  className="group rounded-apple border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:border-white/20 hover:bg-white/8 open:border-white/25"
                  open={i === 0 && !query}
                >
                  <summary className="flex items-start justify-between cursor-pointer text-white">
                    <span className="apple-body font-medium">{f.q}</span>
                    <span className="apple-caption text-apple-gray-500 group-open:hidden">+</span>
                    <span className="apple-caption text-apple-gray-500 hidden group-open:inline">−</span>
                  </summary>
                  <p className="apple-caption text-apple-gray-300 mt-2 leading-snug">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </motion.section>
        ))}
        {!filtered.length && (
          <div className="glass-card p-4 text-center text-apple-gray-400 apple-body">
            Sin resultados para “{query}”. Intenta con otra palabra clave.
          </div>
        )}
      </div>
    </div>
  );
}
