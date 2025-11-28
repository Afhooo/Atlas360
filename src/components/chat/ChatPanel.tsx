'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, Send, Sparkles, User, X } from 'lucide-react';

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

type ChatPanelProps = {
  compact?: boolean;
  onClose?: () => void;
};

export function ChatPanel({ compact = false, onClose }: ChatPanelProps) {
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

  const containerClass = compact ? 'min-h-[520px]' : 'min-h-[620px]';

  const renderMessage = (item: HistoryItem, idx: number) => {
    const isUser = item.role === 'user';
    const Icon = isUser ? User : Bot;

    return (
      <motion.div
        key={`${item.role}-${idx}-${item.content.slice(0, 10)}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className={`flex gap-3 ${isUser ? 'flex-row-reverse text-right' : 'text-left'}`}
      >
        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80">
          <Icon size={16} />
        </span>
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-br from-apple-blue-500 to-apple-blue-700 text-white shadow-apple'
              : 'border border-white/10 bg-white/6 text-white'
          }`}
        >
          {item.content.split('\n').map((line, lineIdx) => (
            <p key={lineIdx} className="mb-1 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[28px] border border-white/12 bg-[rgba(4,7,18,0.92)] shadow-[0_25px_90px_rgba(3,7,18,0.65)] backdrop-blur-2xl ${containerClass}`}
    >
      <div className="relative z-10 flex flex-col gap-4 border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(42,145,255,0.25),transparent_55%)] px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-apple-blue-500 to-apple-green-500 shadow-apple">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Atlas Copilot</p>
            <p className="text-sm text-white/70">Asistente contextual para ventas, cajas e inventario</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SCOPE_LABELS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    scope === s.id
                      ? 'bg-white text-[#060a16]'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-full border border-white/20 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar chat"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4 lg:flex-row">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/2 p-4">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {messages.map((item, idx) => renderMessage(item, idx))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-2xl bg-white/4 px-4 py-2 text-xs text-white/70 backdrop-blur"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Copilot está procesando tu contexto…
                </motion.div>
              )}

              {error && (
                <div className="rounded-2xl border border-apple-red-500/30 bg-apple-red-500/10 px-4 py-2 text-sm text-apple-red-200">
                  {error}
                </div>
              )}

              {!messages.length && !loading && !error && (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/3 p-4 text-sm text-white/70">
                  <p className="font-medium text-white">Sin conversaciones aún.</p>
                  <p>
                    Rompe el hielo con una sugerencia o escribe exactamente lo que necesitas. El copiloto agrega
                    contexto del dashboard donde te encuentres.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <aside className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 lg:max-w-[240px]">
          <p className="text-sm font-medium text-white/80">Sugerencias rápidas</p>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {SCOPE_SUGGESTIONS[scope].map((q) => (
              <button
                key={q}
                type="button"
                onClick={(e) => handleSend(e as any, q)}
                className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs text-white/80 transition hover:border-white/40 hover:bg-white/10"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="mt-auto rounded-2xl border border-white/10 bg-gradient-to-br from-apple-blue-500/30 to-apple-green-500/20 p-3 text-xs text-white/80">
            <p className="font-semibold text-white">Consejo</p>
            <p>Incluye fechas, sucursales o productos para respuestas accionables.</p>
          </div>
        </aside>
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-white/10 px-5 py-4"
      >
        <input
          className="input-apple w-full rounded-2xl bg-white/5 text-white placeholder:text-white/50"
          placeholder="Escribe una pregunta para Atlas Copilot…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary h-11 w-11 rounded-2xl p-0"
          disabled={loading || !input.trim()}
          aria-label="Enviar mensaje"
        >
          {loading ? <Loader2 size={16} className="mx-auto animate-spin" /> : <Send size={16} />}
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
