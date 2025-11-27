// src/lib/auth/permissions.ts
// Permisos simples por rol para módulos de Atlas Suite.
import type { Role } from './roles';
import type { ModuleKey } from '@/lib/config/featureFlags';

// Mapa alto nivel: qué módulos puede ver cada rol lógico
const MODULE_PERMISSIONS: Record<ModuleKey, Role[]> = {
  dashboard: ['admin', 'coordinador', 'lider', 'asesor', 'promotor', 'logistica', 'unknown'],
  // Ventas: admin, gerencia/supervisión y vendedores
  ventas: ['admin', 'coordinador', 'lider', 'asesor', 'unknown'],
  // Inventario: admin, gerencia/supervisión y logística/cajero
  inventario: ['admin', 'coordinador', 'logistica', 'unknown'],
  // RRHH y productividad: solo capas de gestión
  rrhh: ['admin', 'coordinador', 'lider', 'unknown'],
  productividad: ['admin', 'coordinador', 'lider', 'unknown'],
  // Cajas: admin, gerencia y cajeros/logística
  cajas: ['admin', 'coordinador', 'lider', 'logistica', 'unknown'],
  // Configuración: solo administrador
  configuracion: ['admin'],
};

export function canAccessModule(role: Role, module: ModuleKey): boolean {
  if (role === 'admin') return true;
  const allowed = MODULE_PERMISSIONS[module] || [];
  if (role === 'unknown') return true;
  return allowed.includes(role);
}

export function moduleListForRole(role: Role): ModuleKey[] {
  return (Object.keys(MODULE_PERMISSIONS) as ModuleKey[]).filter((m) => canAccessModule(role, m));
}
