'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2 } from 'lucide-react';

type Scope = 'general' | 'ventas' | 'cajas' | 'inventario';

type HistoryItem = { role: 'user' | 'assistant'; content: string };

const SCOPE_LABELS: { id: Scope; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'cajas', label: 'Cajas' },
  { id: 'inventario', label: 'Inventario' },
];

async function askCopilot(message: string, history: HistoryItem[], scope: Scope) {
  const res = await fetch('/endpoints/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, scope }),
  });
  return res.json();
}

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  const initialScope: Scope = useMemo(() => {
    if (!pathname) return 'general';
    if (pathname.startsWith('/ventas')) return 'ventas';
    if (pathname.startsWith('/cajas')) return 'cajas';
    if (pathname.startsWith('/inventario')) return 'inventario';
    return 'general';
  }, [pathname]);

  const [scope, setScope] = useState<Scope>(initialScope);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const nextHistory: HistoryItem[] = [...messages, { role: 'user', content: text }];
    setMessages(nextHistory);
    setInput(overrideText ? input : '');
    setLoading(true);
    setError(null);

    try {
      const res = await askCopilot(text, nextHistory, scope);
      if (!res?.ok) {
        setError(
          res?.error === 'missing_openai_api_key'
            ? 'Falta configurar OPENAI_API_KEY en el servidor.'
            : res?.error || 'No se pudo obtener respuesta del copiloto.'
        );
        setLoading(false);
        return;
      }
      const answer: string = res.answer ?? '';
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al consultar el copiloto.');
    } finally {
      setLoading(false);
    }
  };

  const containerClass = compact ? 'h-[360px]' : 'h-[520px]';

  return (
    <div className={`glass-card flex flex-col ${containerClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-apple-blue-500 to-apple-green-500 flex items-center justify-center shadow-apple">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="apple-body font-semibold text-white">Atlas Copilot</div>
            <div className="apple-caption text-apple-gray-400">
              Pregunta sobre tu negocio, ventas, cajas e inventario.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SCOPE_LABELS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className={`pill ${
                scope === s.id ? 'pill-blue' : ''
              } text-xs px-2 py-0.5`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[80%] rounded-apple bg-apple-blue-600 text-white px-3 py-2 text-sm shadow-apple'
                    : 'max-w-[80%] rounded-apple bg-white/8 text-white px-3 py-2 text-sm border border-white/10'
                }
              >
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-1 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-apple-gray-400 text-xs"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Pensando…
            </motion.div>
          )}
          {error && (
            <div className="apple-caption text-apple-red-300">{error}</div>
          )}
          {!messages.length && !loading && !error && (
            <div className="space-y-2">
              <div className="apple-caption text-apple-gray-500">
                Elige una pregunta rápida o escribe la tuya:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_SUGGESTIONS[scope].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={(e) => handleSend(e as any, q)}
                    className="pill bg-white/10 hover:bg-white/15 border-white/20 text-apple-gray-200 text-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <form
        onSubmit={handleSend}
        className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3"
      >
        <input
          className="input-apple w-full"
          placeholder="Escribe una pregunta para Atlas Copilot…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary px-3 py-2"
          disabled={loading || !input.trim()}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
const SCOPE_SUGGESTIONS: Record<Scope, string[]> = {
  general: [
    'Dame un resumen de cómo va el negocio hoy.',
    '¿Qué tendencias ves en ventas de esta semana?',
    '¿Algún riesgo o alerta que debería revisar primero?',
  ],
  ventas: [
    '¿Qué productos son los más vendidos esta semana?',
    '¿Cómo se comparan las ventas de hoy contra la semana pasada?',
    '¿Qué clientes tienen mayor LTV y deberían cuidarse más?',
  ],
  cajas: [
    '¿Hubo diferencias en cierres de caja hoy?',
    '¿Qué locales presentan más problemas de cuadratura?',
    '¿Algún patrón raro en devoluciones que afecte caja?',
  ],
  inventario: [
    '¿Qué productos tienen stock crítico o rotación lenta?',
    'Recomiéndame acciones para mejorar la rotación de inventario.',
    '¿Hay productos que debería dejar de comprar o empujar más?',
  ],
};
