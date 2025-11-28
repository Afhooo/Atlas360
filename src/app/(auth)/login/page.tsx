// src/app/(auth)/login/page.tsx - PÁGINA CORREGIDA
import { Suspense } from 'react';
import Image from 'next/image';
import { LoginClient, Spinner } from './LoginClient'; 

/**
 * Página de login del sistema
 * - Usa Suspense para manejar la carga de SearchParams
 * - Componente del servidor que renderiza el cliente de login
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen overflow-hidden bg-[#01030a]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#040a1a] to-[#01030a]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_60%)] opacity-70" />
          <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
            <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 px-8 py-10 text-center shadow-[0_45px_120px_rgba(2,6,23,0.55)] backdrop-blur-[26px]">
              <div className="mx-auto mb-6 h-16 w-16">
                <div className="relative h-full w-full">
                  <Image
                    src="/22.svg"
                    alt="Atlas Suite"
                    fill
                    priority
                    sizes="64px"
                    className="object-contain"
                  />
                </div>
              </div>
              <p className="text-sm uppercase tracking-[0.35em] text-white/60">Atlas Suite</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Preparando tu espacio seguro</h1>
              <p className="mt-2 text-sm text-white/65">Cargando interfaz de acceso...</p>
              <div className="mt-8 flex flex-col items-center gap-3 text-white/70">
                <Spinner />
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Verificando estado</span>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}

/**
 * Metadata para SEO y navegador
 */
export const metadata = {
  title: 'Iniciar Sesión - Atlas Suite',
  description: 'Accede al sistema de gestión integral de Atlas Suite',
  robots: 'noindex, nofollow', // No indexar página de login
};
