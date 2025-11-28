'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type SectionCardProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  headerRight?: ReactNode;
};

export function SectionCard({
  icon,
  title,
  description,
  children,
  className,
  headerRight,
}: SectionCardProps) {
  return (
    <section className={cn('glass-card p-4 sm:p-6 space-y-4', className)}>
      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-apple bg-white/5 border border-white/15 flex items-center justify-center text-apple-gray-100">
              {icon}
            </div>
          )}
          <div>
            <h2 className="apple-h3 text-white">{title}</h2>
            {description && <p className="apple-caption text-apple-gray-400">{description}</p>}
          </div>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {children}
    </section>
  );
}

