'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeRole, getRoleHomeRoute, type Role } from '@/lib/auth/roles';

type UserInfo = {
  ok: boolean;
  role?: string;
  full_name?: string;
  id?: string;
};

export default function PostLoginRouter() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'error'>('checking');
  const [message, setMessage] = useState('Verificando sesión…');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    let canceled = false;

    const redirectUser = async () => {
      try {
        setStatus('checking');
        setMessage('Verificando sesión…');

        const response = await fetch('/endpoints/me', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' },
        });

        const userData: UserInfo = await response.json();
        if (!response.ok || !userData?.ok) throw new Error('Sesión inválida');
        if (canceled) return;

        setUserInfo(userData);
        const normalizedRole = normalizeRole(userData.role) as Role;
        const homeRoute = getRoleHomeRoute(normalizedRole) || '/dashboard';

        setStatus('redirecting');
        setMessage(`Bienvenido ${userData.full_name || 'Usuario'}, redirigiendo a tu inicio…`);

        setTimeout(() => {
          router.replace(homeRoute === '/post-login' ? '/dashboard' : homeRoute);
        }, 1500);
      } catch (error) {
        console.error('Error en post-login:', error);
        if (canceled) return;
        setStatus('error');
        setMessage('No se pudo resolver tu inicio. Usa los accesos directos.');
      }
    };

    redirectUser();
    return () => {
      canceled = true;
    };
  }, [router]);

  const quickAccess = [
    { href: '/dashboard', label: 'Administración', emoji: '🏢' },
    { href: '/dashboard/asesores/HOME', label: 'Asesores / Vendedores', emoji: '👥' },
    { href: '/dashboard/promotores', label: 'Promotores', emoji: '📢' },
    { href: '/logistica', label: 'Logística', emoji: '🚚' },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#01030a]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#040a1a] to-[#01030a]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_60%)] opacity-60" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl rounded-[36px] border border-white/10 bg-white/5 px-6 py-10 shadow-[0_45px_120px_rgba(2,6,23,0.55)] backdrop-blur-[26px] lg:px-10">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="w-full space-y-5 text-center lg:w-1/2 lg:text-left">
              <div className="mx-auto h-16 w-16 lg:mx-0">
                <Image src="/22.svg" alt="Atlas Suite" width={64} height={64} priority className="object-contain" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-white/60">Atlas Suite</p>
                <h1 className="mt-2 text-3xl font-semibold text-white">Validando tu sesión segura</h1>
                <p className="mt-2 text-white/70">{message}</p>
              </div>
              {status !== 'error' ? (
                <div className="flex flex-col items-center gap-3 lg:items-start">
                  <div className="w-12 h-12 rounded-full border-2 border-apple-blue-500/70 border-t-transparent animate-spin" />
                  <span className="text-xs uppercase tracking-[0.3em] text-white/50">Sincronizando</span>
                  {userInfo && status === 'redirecting' && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
                      Rol {normalizeRole(userInfo.role)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-white/70">
                    No pudimos redirigirte automáticamente. Elige tu módulo para continuar.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {quickAccess.map((cta) => (
                      <a
                        key={cta.href}
                        href={cta.href}
                        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/40 hover:text-white"
                      >
                        <span className="mr-2">{cta.emoji}</span>
                        {cta.label}
                      </a>
                    ))}
                  </div>
                  <div className="pt-4 text-xs text-white/60">
                    <a href="/login" className="underline-offset-4 hover:underline">
                      Volver al login
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full space-y-5 rounded-3xl border border-white/10 bg-white/5 px-6 py-6 lg:w-1/2">
              <p className="text-sm uppercase tracking-[0.35em] text-white/60">Saltos rápidos</p>
              <ul className="space-y-4 text-left text-white/80">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-apple-blue-400" />
                  Integridad de sesión y permisos en curso.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-apple-green-400" />
                  Carga de datos operativos en segundo plano.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-apple-orange-400" />
                  Redirección automática a tu módulo principal.
                </li>
              </ul>
              {status !== 'error' && (
                <p className="text-xs text-white/60">
                  Si la sincronización tarda más de lo habitual, refresca o comunícate con soporte Atlas.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
