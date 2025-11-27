'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, BarChart3, Users, UserPlus, Package,
  RotateCcw, Calendar, FileText, Settings, CheckCircle2,
  LogOut, ChevronRight, Sparkles, Activity, ShieldCheck, Route
} from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { useState, useEffect } from 'react';
import LogoutButton from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';

// Importa roles SOLO desde lib/auth/roles
import { can, ROUTES, type Role } from '@/lib/auth/roles';
import { FINANCIAL_CONTROL_IDS } from '@/lib/auth/financial';
import { moduleFlags, type ModuleKey } from '@/lib/config/featureFlags';
import { canAccessModule } from '@/lib/auth/permissions';

type NavLinkItem = {
  href: string;
  icon: ReactNode;
  label: string;
  shortcut?: string;
  req?: Parameters<typeof can>[1];
  badge?: string | number;
  requiresPersonId?: string[];
  module?: ModuleKey;
};

type SidebarProps = {
  userRole: Role;
  userName: string;
  isOpen?: boolean;
  onClose?: () => void;
};

type MeResponse = {
  ok?: boolean;
  id?: string;
  full_name?: string;
  role?: string;
  privilege_level?: number;
  email?: string;
  raw_role?: string;
  local?: string | null;
} | null;

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

const NavLink: FC<{ item: NavLinkItem; active?: boolean; onClick?: () => void }> = 
({ item, active, onClick }) => (
  <motion.div
    whileHover={{ x: 2 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
  >
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-apple-body font-medium min-w-0',
        'transition-all duration-300 ease-apple',
        'hover:bg-[color:var(--hover-surface)] hover:backdrop-blur-sm dark:hover:bg-white/10',
        active
          ? 'text-[color:var(--app-foreground)] dark:text-white bg-gradient-to-r from-apple-blue-500/10 to-apple-green-500/10 dark:from-apple-blue-600/20 dark:to-apple-blue-500/10 border border-[color:var(--app-border-strong)] dark:border-apple-blue-500/30 shadow-[0_8px_24px_rgba(36,99,235,0.18)] dark:shadow-primary'
          : 'text-apple-gray-600 hover:text-[color:var(--app-foreground)] dark:text-apple-gray-300 dark:hover:text-white',
      ].join(' ')}
      title={item.label}
    >
      {active && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-apple-blue-400 to-apple-blue-600 rounded-r-full"
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      )}
      <div className={[
        'relative flex items-center justify-center w-5 h-5 transition-transform duration-300',
        active ? 'text-apple-blue-400' : 'text-current group-hover:scale-110',
      ].join(' ')}>
        {item.icon}
      </div>
      <span className="flex-1 min-w-0 text-left whitespace-normal leading-tight break-words">{item.label}</span>
      {item.shortcut && (
        <kbd className={[
          'text-apple-caption2 font-mono px-1.5 py-0.5 rounded border transition-all duration-300',
          active
            ? 'text-apple-blue-300 border-apple-blue-400/40 bg-apple-blue-400/10'
            : 'text-apple-gray-500 border-apple-gray-700 group-hover:text-apple-gray-300 group-hover:border-apple-gray-600',
        ].join(' ')}>
          {item.shortcut}
        </kbd>
      )}
      <ChevronRight
        size={14}
        className={[
          'transition-all duration-300 opacity-0 group-hover:opacity-60',
          active ? 'text-apple-blue-400' : 'text-current',
        ].join(' ')}
      />
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 hidden xl:block">
        <div className="px-3 py-1 rounded-lg bg-black/85 text-apple-caption2 text-white shadow-xl border border-white/10 whitespace-nowrap">
          {item.label}
        </div>
      </div>
    </Link>
  </motion.div>
);

const SectionHeader: FC<{ title: string; icon?: ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 px-3 py-2 mb-2">
    {icon && (<div className="text-apple-gray-500">{icon}</div>)}
    <h3 className="text-apple-caption1 font-semibold text-apple-gray-500 tracking-wider uppercase">{title}</h3>
  </div>
);

export const Sidebar: FC<SidebarProps> = ({
  userRole,
  userName,
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<MeResponse>(null);
  const [meLoaded, setMeLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/endpoints/me', { cache: 'no-store' });
        setCurrentUser(res.ok ? await res.json() : null);
      } catch {
        setCurrentUser(null);
      } finally {
        setMeLoaded(true);
      }
    })();
  }, []);

  const SECTIONS: { title: string; icon?: ReactNode; items: NavLinkItem[] }[] = [
    {
      title: 'Operación',
      icon: <Home size={12} />,
      items: [
        { href: '/dashboard', icon: <Home size={18} />, label: 'Dashboard', shortcut: 'H', module: 'dashboard' },
        { href: '/ventas', icon: <BarChart3 size={18} />, label: 'Ventas (análisis)', shortcut: 'V', module: 'ventas' },
        { href: '/ventas/registro', icon: <UserPlus size={18} />, label: 'Registrar venta', module: 'ventas' },
        { href: '/inventario', icon: <Package size={18} />, label: 'Inventario', shortcut: 'I', module: 'inventario' },
        { href: '/logistica', icon: <Route size={18} />, label: 'Logística', shortcut: 'L', module: 'inventario', req: 'view:logistica' },
      ],
    },
    {
      title: 'Finanzas',
      icon: <Activity size={12} />,
      items: [
        {
          href: '/cajas',
          icon: <Activity size={18} />,
          label: 'Cajas y cuadratura',
          shortcut: 'F',
          module: 'cajas',
          requiresPersonId: [...FINANCIAL_CONTROL_IDS],
        },
      ],
    },
    {
      title: 'Personas',
      icon: <Users size={12} />,
      items: [
        { href: '/rrhh', icon: <Calendar size={18} />, label: 'RRHH y asistencia', shortcut: 'R', module: 'rrhh' },
        { href: '/productividad', icon: <BarChart3 size={18} />, label: 'Productividad', module: 'productividad' },
      ],
    },
    {
      title: 'Configuración',
      icon: <Settings size={12} />,
      items: [
        { href: '/configuracion', icon: <Settings size={18} />, label: 'Parámetros', module: 'configuracion' },
        { href: '/configuracion/usuarios', icon: <Settings size={18} />, label: 'Usuarios y roles', shortcut: '8', module: 'configuracion' },
      ],
    },
  ];

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: isOpen || typeof window === 'undefined' || window.innerWidth >= 1024 ? 0 : -320 }}
        exit={{ x: -320 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed left-0 top-0 h-screen w-80 z-50 flex flex-col glass backdrop-blur-apple-lg border-r border-[color:var(--app-border)] dark:border-white/10 transition-colors duration-500 lg:translate-x-0 lg:static lg:z-30"
      >
        <div className="p-6 border-b border-[color:var(--app-border)] dark:border-white/10 transition-colors duration-500">
          <Link href={ROUTES.DASH} className="group flex items-center gap-3" onClick={onClose}>
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 rounded-xl border border-white/20" />
              <div className="relative w-full h-full flex items-center justify-center">
                <Image src="/1.png" alt="Atlas 360" width={24} height={24} className="object-contain" priority />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="apple-h3 text-white group-hover:text-apple-blue-300 transition-colors duration-300">Atlas 360</div>
              <div className="text-apple-caption text-apple-gray-500 -mt-0.5">Sistema de gestión</div>
            </div>
            <Sparkles size={16} className="text-apple-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto scrollbar-thin transition-colors duration-500">
          {SECTIONS.map((section) => {
          const items = section.items.filter((item) => {
            if (item.module && (!moduleFlags[item.module] || !canAccessModule(userRole, item.module))) {
              return false;
            }
            if (item.requiresPersonId) {
              if (!meLoaded) return false;
              return !!currentUser?.id && item.requiresPersonId.includes(currentUser.id);
            }
            return !item.req || can(userRole, item.req);
          });

            if (!items.length) return null;

            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="space-y-1"
              >
                <SectionHeader title={section.title} icon={section.icon} />
                <div className="space-y-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(pathname, item.href)}
                      onClick={onClose}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-4 mt-auto space-y-3 border-t border-[color:var(--app-border)] dark:border-white/10">
          <ThemeToggle />

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300 bg-[color:var(--glass-card-bg,rgba(255,255,255,0.7))] hover:bg-[color:var(--hover-surface)] dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apple-blue-500/30 to-apple-green-500/30 flex items-center justify-center text-apple-body font-semibold text-[color:var(--app-foreground)] dark:text-white border border-[color:var(--app-border)] dark:border-white/20">
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-apple-green-500 rounded-full border-2 border-[color:var(--app-bg)] dark:border-black" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-apple-body font-medium text-[color:var(--app-foreground)] dark:text-white truncate">{userName || 'Usuario'}</div>
              <div className="text-apple-caption text-apple-gray-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-apple-green-400 animate-pulse" />
                En línea
              </div>
            </div>
          </motion.div>

          <LogoutButton className="w-full btn-ghost justify-start gap-3 text-apple-gray-500 hover:text-[color:var(--app-foreground)] dark:hover:text-white hover:bg-[color:var(--hover-surface)] dark:hover:bg-apple-red-600/10 hover:border-[color:var(--app-border-strong)] dark:hover:border-apple-red-500/30">
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </LogoutButton>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
