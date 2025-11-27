import { AppShell } from '@/components/shell/AppShell';

export default function VentasLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Ventas">{children}</AppShell>;
}
