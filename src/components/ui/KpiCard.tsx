'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

type Tone = 'blue' | 'green' | 'orange' | 'red' | 'purple';

type KpiCardProps = {
  label: string;
  value: string | number;
  helper?: string | ReactNode;
  trendLabel?: string;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
};

const TONE_CLASSES: Record<Tone, string> = {
  blue: 'from-apple-blue-500/24 via-apple-blue-600/14 to-apple-blue-900/40 border-apple-blue-500/40 text-apple-blue-300',
  green: 'from-apple-green-500/24 via-apple-green-600/14 to-apple-green-900/40 border-apple-green-500/40 text-apple-green-300',
  orange: 'from-apple-orange-500/24 via-apple-orange-600/14 to-apple-orange-900/40 border-apple-orange-500/40 text-apple-orange-300',
  red: 'from-apple-red-500/24 via-apple-red-600/14 to-apple-red-900/40 border-apple-red-500/40 text-apple-red-300',
  purple:
    'from-apple-blue-500/30 via-violet-600/20 to-apple-purple-900/40 border-apple-purple-500/40 text-apple-purple-300',
};

export function KpiCard({
  label,
  value,
  helper,
  trendLabel,
  tone = 'blue',
  icon,
  className,
}: KpiCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'glass-card p-4 border bg-white/5 relative overflow-hidden transition-all duration-300',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-px rounded-[10px] bg-gradient-to-br from-white/4 via-transparent to-white/0" />
      <div className="relative z-10 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="apple-caption text-apple-gray-300">{label}</p>
            {typeof helper === 'string' && (
              <p className="apple-caption text-apple-gray-500 sm:hidden">{helper}</p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'w-9 h-9 rounded-[999px] bg-gradient-to-br border flex items-center justify-center shadow-apple-sm',
                TONE_CLASSES[tone]
              )}
            >
              {icon}
            </div>
          )}
        </div>
        <p className="text-2xl font-semibold text-white">{value}</p>
        <div className="flex items-center justify-between gap-2">
          {helper && typeof helper !== 'string' && (
            <div className="apple-caption text-apple-gray-500">{helper}</div>
          )}
          {typeof helper === 'string' && (
            <p className="apple-caption text-apple-gray-500 hidden sm:block">{helper}</p>
          )}
          {trendLabel && (
            <p
              className={cn(
                'apple-caption font-medium',
                trendLabel.startsWith('+')
                  ? 'text-apple-green-400'
                  : trendLabel.startsWith('-')
                  ? 'text-apple-red-400'
                  : 'text-apple-gray-400'
              )}
            >
              {trendLabel}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

