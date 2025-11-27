'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { ChatPanel } from '@/components/chat/ChatPanel';
import type { Role } from '@/lib/auth/roles';

export function ChatFloatingButton({ role }: { role: Role }) {
  // Solo jefatura / admin ven el copiloto flotante
  if (!['admin', 'coordinador', 'lider'].includes(role)) {
    return null;
  }

  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-[1070] rounded-full bg-gradient-to-br from-apple-blue-500 to-apple-green-500 shadow-apple-xl w-12 h-12 flex items-center justify-center text-white hover:scale-105 hover:shadow-apple-xl transition-transform"
        aria-label="Abrir Atlas Copilot"
      >
        <MessageCircle size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[1080] flex items-end justify-end sm:items-center sm:justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative z-[1081] w-full max-w-md m-4"
            >
              <ChatPanel compact />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

