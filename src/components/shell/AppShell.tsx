// src/components/shell/AppShell.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { Sidebar } from '@/components/nav/Sidebar';
import { normalizeRole, type Role } from '@/lib/auth/roles';
import { canAccessModule } from '@/lib/auth/permissions';
import { moduleFlags, type ModuleKey } from '@/lib/config/featureFlags';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
};

const PATH_TITLES: { pattern: RegExp; title: string; module: ModuleKey }[] = [
  { pattern: /^\/dashboard/, title: 'Dashboard', module: 'dashboard' },
  { pattern: /^\/ventas/, title: 'Ventas', module: 'ventas' },
  { pattern: /^\/inventario/, title: 'Inventario', module: 'inventario' },
  { pattern: /^\/rrhh/, title: 'RRHH y Asistencia', module: 'rrhh' },
  { pattern: /^\/productividad/, title: 'Productividad', module: 'productividad' },
  { pattern: /^\/cajas/, title: 'Cajas y Cuadraturas', module: 'cajas' },
  { pattern: /^\/configuracion/, title: 'Configuración', module: 'configuracion' },
];

function resolveTitle(pathname: string): { title: string; module: ModuleKey | null } {
  const found = PATH_TITLES.find((p) => p.pattern.test(pathname));
  if (found) return { title: found.title, module: found.module };
  return { title: 'Atlas 360', module: null };
}

export function AppShell({ children, title }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: me, error } = useSWR('/endpoints/me', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  });

  const role: Role = useMemo(() => normalizeRole(me?.role), [me?.role]);
  const name = me?.full_name || 'Usuario';
  const business = 'Atlas 360';

  const { title: autoTitle, module } = resolveTitle(pathname || '/');
  const currentTitle = title || autoTitle;

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Bloquea acceso si el módulo está desactivado
  const moduleActive = module ? moduleFlags[module] !== false : true;
  const moduleAllowed = module ? canAccessModule(role, module) : true;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-6 text-center">
          <p className="apple-body">Error al cargar sesión.</p>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card text-center">
          <div className="animate-spin w-8 h-8 border-2 border-apple-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="apple-caption">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!moduleActive || !moduleAllowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-3 px-6">
        <div className="glass-card p-8 max-w-md space-y-3">
          <h1 className="apple-h3 text-white">Módulo no disponible</h1>
          <p className="apple-body text-apple-gray-300">
            Este módulo está desactivado o no tienes permisos para acceder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-black">
      <Sidebar userRole={role} userName={name} isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-30">
          <div className="glass backdrop-blur-apple-lg border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={toggleSidebar} className="btn-ghost btn-sm p-2 lg:hidden" aria-label="Abrir menú">
                  <Menu size={20} />
                </button>
                <div>
                  <div className="text-apple-footnote font-semibold text-white">{currentTitle}</div>
                  <div className="text-apple-caption text-apple-gray-500">{business}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-apple-footnote font-medium text-white truncate max-w-40">{name}</div>
                  <div className="text-apple-caption2 text-apple-gray-500 capitalize">{role}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-apple-blue-500/30 to-apple-green-500/30 flex items-center justify-center text-apple-footnote font-semibold text-white border border-white/20">
                  {name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 relative p-4 sm:p-6 lg:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-apple-blue-950/5 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
