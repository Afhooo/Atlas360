'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Users, Plus, Save, Shield } from 'lucide-react';
import { demoUsers } from '@/lib/demo/mockData';
import { moduleFlags, type ModuleKey } from '@/lib/config/featureFlags';
import { moduleListForRole } from '@/lib/auth/permissions';
import { normalizeRole, type Role } from '@/lib/auth/roles';

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

const ROLE_OPTIONS = [
  { value: 'ADMINISTRADOR', label: 'Administrador', hint: 'Acceso completo a todos los módulos.' },
  { value: 'GERENTE', label: 'Gerente', hint: 'Visión ejecutiva de ventas, cajas y equipo.' },
  { value: 'VENDEDOR', label: 'Vendedor', hint: 'Panel de ventas, pipeline y clientes.' },
  { value: 'CAJERO', label: 'Cajero', hint: 'Cajas e inventario operativos.' },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]['value'];

const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  ventas: 'Ventas',
  inventario: 'Inventario',
  rrhh: 'RRHH',
  productividad: 'Productividad',
  cajas: 'Cajas',
  configuracion: 'Configuración',
};

export default function UsuariosPage() {
  const { data, mutate } = useSWR<{ ok: boolean; data?: UserRow[] }>(
    '/endpoints/users?pageSize=50',
    fetcher,
    { onError: () => undefined }
  );

  const users: UserRow[] = data?.data ?? demoUsers;

  const [form, setForm] = useState<{
    full_name: string;
    email: string;
    role: RoleValue;
    active: boolean;
  }>({
    full_name: '',
    email: '',
    role: ROLE_OPTIONS[2].value,
    active: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email || undefined,
        fenix_role: form.role,
        active: form.active,
      };

      const res = await fetch(
        editingId ? `/endpoints/users/${editingId}` : '/endpoints/users',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Error ${res.status}`);
      }

      setMessage({
        type: 'success',
        text: editingId ? 'Usuario actualizado.' : 'Usuario creado correctamente.',
      });
      setEditingId(null);
      setForm({
        full_name: '',
        email: '',
        role: ROLE_OPTIONS[2].value,
        active: true,
      });
      await mutate();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'No se pudo guardar el usuario.',
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u: UserRow) => {
    setEditingId(u.id);
    setForm({
      full_name: u.full_name || '',
      email: u.email || '',
      role: ((u.fenix_role || ROLE_OPTIONS[2].value) as RoleValue),
      active: u.active,
    });
    setMessage(null);
  };

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
                <tr
                  key={u.id}
                  className="text-white/90 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => startEdit(u)}
                >
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
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
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
              onChange={(e) =>
                setForm((p) => ({ ...p, role: e.target.value as RoleValue }))
              }
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
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
            <button className="btn-primary flex items-center gap-2" type="submit" disabled={saving}>
              <Save size={16} />
              {saving ? 'Guardando...' : editingId ? 'Actualizar usuario' : 'Crear usuario'}
            </button>
          </div>
        </form>
        {message && (
          <p
            className={`apple-caption ${
              message.type === 'success' ? 'text-apple-green-300' : 'text-apple-red-300'
            }`}
          >
            {message.text}
          </p>
        )}
      </section>

      <section className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-apple-blue-300" />
          <h2 className="apple-h3 text-white">Permisos por rol</h2>
        </div>
        <p className="apple-caption text-apple-gray-400">
          Este resumen muestra qué módulos puede ver cada tipo de usuario. Cambia los permisos en
          <code className="ml-1 px-1 rounded bg-white/10 text-[11px]">src/lib/auth/permissions.ts</code>{' '}
          si necesitas ajustar accesos.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_OPTIONS.map((opt) => {
            const logical: Role = normalizeRole(opt.value);
            const modules = moduleListForRole(logical).filter((m) => moduleFlags[m]);
            return (
              <div key={opt.value} className="glass-card p-3 border bg-white/5 space-y-2">
                <div className="apple-caption text-apple-gray-300">{opt.label}</div>
                <div className="apple-caption text-apple-gray-500 mb-1">{opt.hint}</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {modules.map((m) => (
                    <span key={m} className="pill-blue">
                      {MODULE_LABELS[m]}
                    </span>
                  ))}
                  {!modules.length && (
                    <span className="apple-caption text-apple-gray-500">Sin módulos asignados</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
