// src/components/shell/AppShell.tsx
'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { Sidebar } from '@/components/nav/Sidebar';
import { ChatFloatingButton } from '@/components/chat/ChatFloatingButton';
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
  return { title: 'Atlas Suite', module: null };
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
  const business = 'Atlas Suite';

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
  const moduleActive = module ? moduleFlags[module] === true : true;
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
      <div className="relative min-h-screen overflow-hidden bg-[#01030a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#040a1a] to-[#01030a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_60%)] opacity-70" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 px-8 py-10 text-center shadow-[0_45px_120px_rgba(2,6,23,0.55)] backdrop-blur-[26px]">
            <div className="mx-auto mb-6 h-16 w-16">
              <Image src="/22.svg" alt="Atlas Suite" width={64} height={64} priority className="object-contain" />
            </div>
            <p className="text-sm uppercase tracking-[0.35em] text-white/60">Atlas Suite</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Sincronizando tu sesión</h1>
            <p className="mt-2 text-sm text-white/65">Validando permisos y datos operativos…</p>
            <div className="mt-8 flex flex-col items-center gap-3 text-white/70">
              <div className="w-10 h-10 rounded-full border-2 border-apple-blue-500/70 border-t-transparent animate-spin" />
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">Cargando</span>
            </div>
          </div>
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
    <div className="min-h-screen flex bg-black text-[13px]">
      <Sidebar userRole={role} userName={name} isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
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

        <main className="flex-1 relative p-3 sm:p-4 lg:p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-apple-blue-950/5 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-6">{children}</div>
        </main>
        <ChatFloatingButton role={role} />
      </div>
    </div>
  );
}
