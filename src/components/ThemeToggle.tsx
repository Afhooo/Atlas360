'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const label = useMemo(() => (isDark ? 'Modo oscuro' : 'Modo claro'), [isDark]);

  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'inline-flex items-center rounded-full p-0.5 self-start',
        'transition-colors duration-300 ease-apple shadow-[0_3px_8px_rgba(15,23,42,0.45)]',
        'bg-[color:var(--toggle-bg)] text-[color:var(--toggle-fg)]',
        'dark:bg-white/10 dark:text-white/80 dark:shadow-[0_4px_10px_rgba(0,0,0,0.7)]',
        className,
      )}
    >
      <motion.div
        layout
        className="relative h-3.5 w-7 rounded-full border border-[color:var(--toggle-indicator-border)] bg-[color:var(--toggle-indicator-bg)] transition-colors duration-300"
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute left-[2px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full bg-white shadow-[0_3px_8px_rgba(15,23,42,0.5)] dark:bg-black dark:shadow-[0_3px_8px_rgba(0,0,0,0.8)] flex items-center justify-center"
          animate={{ x: isDark ? 8 : 0 }}
        >
          <motion.div
            key={isDark ? 'moon' : 'sun'}
            initial={{ opacity: 0, rotate: isDark ? -10 : 10, y: 2 }}
            animate={{ opacity: 1, rotate: 0, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {isDark ? <Moon size={8} strokeWidth={1.4} /> : <Sun size={8} strokeWidth={1.4} />}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.button>
  );
}
