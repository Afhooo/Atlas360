// src/lib/auth/permissions.ts
// Permisos simples por rol para módulos de Atlas 360.
import type { Role } from './roles';
import type { ModuleKey } from '@/lib/config/featureFlags';

const MODULE_PERMISSIONS: Record<ModuleKey, Role[]> = {
  dashboard: ['admin', 'coordinador', 'lider', 'asesor', 'promotor', 'logistica', 'unknown'],
  ventas: ['admin', 'coordinador', 'lider', 'asesor', 'promotor'],
  inventario: ['admin', 'coordinador', 'logistica'],
  rrhh: ['admin', 'coordinador', 'lider'],
  productividad: ['admin', 'coordinador', 'lider'],
  cajas: ['admin', 'coordinador', 'lider'],
  configuracion: ['admin'],
};

export function canAccessModule(role: Role, module: ModuleKey): boolean {
  const allowed = MODULE_PERMISSIONS[module] || [];
  if (role === 'admin') return true;
  return allowed.includes(role);
}

export function moduleListForRole(role: Role): ModuleKey[] {
  return (Object.keys(MODULE_PERMISSIONS) as ModuleKey[]).filter((m) => canAccessModule(role, m));
}
