import { AppShell } from '@/components/shell/AppShell';

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Clientes">{children}</AppShell>;
}
