'use client';

import { AppShell } from '@/components/shell/AppShell';

export default function LogisticaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Logística">{children}</AppShell>;
}
