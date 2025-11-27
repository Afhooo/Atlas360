'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Users, Plus, Save } from 'lucide-react';
import { demoUsers } from '@/lib/demo/mockData';

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  fenix_role: string | null;
  active: boolean;
};

const fetcher = async (u: string) => {
  const res = await fetch(u, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

export default function UsuariosPage() {
  const { data } = useSWR<{ ok: boolean; data?: UserRow[] }>('/endpoints/users?pageSize=50', fetcher, {
    onError: () => undefined,
  });

  const users: UserRow[] = data?.data ?? demoUsers;

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'ASESOR',
    active: true,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="apple-h1 text-white">Usuarios y roles</h1>
        <p className="apple-body text-apple-gray-400">
          Mantén tu equipo organizado con roles y estados.
        </p>
      </header>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Users className="text-apple-blue-300" size={20} />
          <div>
            <h2 className="apple-h3 text-white">Listado</h2>
            <p className="apple-caption text-apple-gray-400">Consulta rápida de usuarios activos</p>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-apple-gray-400">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Correo</th>
                <th className="py-2 pr-4">Rol</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="text-white/90">
                  <td className="py-2 pr-4 font-semibold">{u.full_name}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">{u.fenix_role}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        u.active ? 'bg-apple-green-500/20 text-apple-green-200' : 'bg-apple-orange-500/20 text-apple-orange-200'
                      }`}
                    >
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-apple-blue-300" />
          <h2 className="apple-h3 text-white">Crear / Editar usuario</h2>
        </div>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Nombre completo</span>
            <input
              className="input-apple w-full"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Ej. Ana Pérez"
            />
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Correo</span>
            <input
              className="input-apple w-full"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="correo@empresa.com"
            />
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Rol</span>
            <select
              className="input-apple w-full"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="COORDINADOR">COORDINADOR</option>
              <option value="LIDER">LIDER</option>
              <option value="ASESOR">ASESOR</option>
              <option value="PROMOTOR">PROMOTOR</option>
              <option value="LOGISTICA">LOGISTICA</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="apple-caption text-apple-gray-400">Estado</span>
            <select
              className="input-apple w-full"
              value={form.active ? 'true' : 'false'}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === 'true' }))}
            >
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button className="btn-primary flex items-center gap-2" type="submit">
              <Save size={16} />
              Guardar (conector pendiente)
            </button>
          </div>
        </form>
        <p className="apple-caption text-apple-gray-500">
          El guardado se conectará al endpoint /endpoints/users; hoy es un formulario listo para integrar.
        </p>
      </section>
    </div>
  );
}
