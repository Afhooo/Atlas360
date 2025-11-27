// src/lib/config/featureFlags.ts
// Flags simples para activar/desactivar módulos principales de Atlas 360.
// Úsalos en Sidebar y guardas de rutas para ocultar secciones sin romper el código.
export const moduleFlags = {
  dashboard: true,
  ventas: true,
  inventario: true,
  rrhh: true,
  productividad: true,
  cajas: true,
  configuracion: true,
} as const;

export type ModuleKey = keyof typeof moduleFlags;
