import { AppShell } from '@/components/shell/AppShell';

export default function AyudaLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Ayuda y FAQs">{children}</AppShell>;
}
