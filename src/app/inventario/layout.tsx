import { AppShell } from '@/components/shell/AppShell';

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Inventario">{children}</AppShell>;
}
