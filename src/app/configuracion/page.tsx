'use client';

import Link from 'next/link';
import { Settings, Users } from 'lucide-react';

export default function ConfiguracionPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Configuración</h1>
        <p className="apple-body text-apple-gray-400">
          Gestiona usuarios, roles, locales y parámetros generales de Atlas 360.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/configuracion/usuarios"
          className="glass-card p-4 sm:p-6 flex items-center gap-3 hover:shadow-apple-lg transition"
        >
          <div className="w-10 h-10 rounded-apple bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/15 flex items-center justify-center text-apple-blue-200">
            <Users size={18} />
          </div>
          <div>
            <h3 className="apple-h4 text-white">Usuarios y roles</h3>
            <p className="apple-caption text-apple-gray-400">Altas, bajas y permisos por rol.</p>
          </div>
        </Link>

        <div className="glass-card p-4 sm:p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-apple bg-gradient-to-br from-apple-blue-500/20 to-apple-green-500/20 border border-white/15 flex items-center justify-center text-apple-blue-200">
            <Settings size={18} />
          </div>
          <div>
            <h3 className="apple-h4 text-white">Parámetros generales</h3>
            <p className="apple-caption text-apple-gray-400">Configura locales, dominios y preferencias.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
