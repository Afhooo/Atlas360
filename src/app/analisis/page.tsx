'use client';

import { ChatPanel } from '@/components/chat/ChatPanel';

export default function AnalisisPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Análisis con Atlas Copilot</h1>
        <p className="apple-body text-apple-gray-400">
          Haz preguntas sobre ventas, clientes, inventario y cajas. El copiloto usa los datos reales de Atlas Suite.
        </p>
      </header>

      <ChatPanel />
    </div>
  );
}

