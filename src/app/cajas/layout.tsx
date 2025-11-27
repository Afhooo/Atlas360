import { AppShell } from '@/components/shell/AppShell';

export default function CajasLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Cajas y Cuadraturas">{children}</AppShell>;
}
