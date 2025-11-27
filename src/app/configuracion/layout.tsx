import { AppShell } from '@/components/shell/AppShell';

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return <AppShell title="Configuración">{children}</AppShell>;
}
