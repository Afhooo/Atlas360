// src/lib/auth/roles.ts — ÚNICA FUENTE DE VERDAD (coherente con todo el proyecto)

/* =========================
   Rutas usadas por UI / redirects
   ========================= */
   export const ROUTES = {
    DASH: '/dashboard',
  
    // Reportes / análisis
   SALES_REPORT: '/dashboard/sales-report',
   REPORTE_VENDEDORES: '/dashboard/vendedores',
   REPORTE_PROMOTORES: '/dashboard/promotores/admin',
    VALIDACION_PROMOTORES: '/dashboard/promotores/validacion',
    VALIDACION_ASESORES: '/dashboard/asesores/validacion',
    ASISTENCIA_PANEL: '/dashboard/admin/resumen',
  
    // Operación
    REGISTRO_ASESORES: '/dashboard/asesores/registro',
    REGISTRO_PROMOTORES: '/dashboard/promotores/registro',
   DEVOLUCIONES: '/dashboard/asesores/devoluciones',
   ASISTENCIA: '/asistencia',
   LOGISTICA: '/logistica',
    INVENTARIO: '/dashboard/inventario',
    MI_RESUMEN: '/mi/resumen',
    PLAYBOOK: '/dashboard/asesores/playbook-whatsapp',
    USERS_ADMIN: '/dashboard/admin/usuarios',
    PERMISOS_ADMIN: '/dashboard/permisos',
  } as const;
  
  /* =========================
     Tipos
     ========================= */
  export type Role =
    | 'admin'
    | 'coordinador'
    | 'lider'
    | 'asesor'
    | 'promotor'
    | 'logistica'
    | 'unknown';
  
  export type Cap =
    | 'view:kpis'
    | 'view:sales-report'
    | 'view:resumen-asesores'
    | 'view:resumen-promotores'
    | 'view:validacion-asesores'
    | 'view:validacion-promotores'
    | 'view:reporte-asistencia'
    | 'view:logistica'
    | 'view:inventario'
    | 'view:registro-asesores'
    | 'view:registro-promotores'
    | 'view:devoluciones'
    | 'view:asistencia'
    | 'view:playbook'
    | 'view:users-admin'
    | 'view:mi-resumen';
  
  /* =========================
     Permisos por rol (lo que usa Sidebar.can)
     ========================= */
  const ROLE_CAPS: Record<Role, Cap[]> = {
    admin: [
      'view:kpis','view:sales-report','view:resumen-asesores','view:resumen-promotores','view:reporte-asistencia',
      'view:logistica','view:inventario','view:registro-asesores','view:registro-promotores','view:devoluciones','view:asistencia',
      'view:playbook','view:users-admin','view:mi-resumen','view:validacion-promotores','view:validacion-asesores'
    ],
    coordinador: [
      'view:kpis','view:logistica','view:inventario','view:asistencia','view:reporte-asistencia','view:resumen-asesores','view:playbook'
    ],
    lider: [
      'view:kpis','view:resumen-asesores','view:resumen-promotores','view:reporte-asistencia','view:logistica',
      'view:asistencia','view:sales-report','view:playbook','view:validacion-asesores'
    ],
    asesor: [
      'view:registro-asesores','view:asistencia','view:playbook','view:mi-resumen'
    ],
    promotor: [
      'view:registro-promotores','view:mi-resumen'
    ],
    logistica: [
      'view:logistica','view:asistencia'
    ],
    unknown: [],
  };
  
  export const can = (role: Role, cap: Cap) => (ROLE_CAPS[role] ?? []).includes(cap);
  
  /* =========================
     Normalización de roles (entrada sucia → tipado interno)
     ========================= */
  export function normalizeRole(raw?: string | null): Role {
    const r = String(raw ?? '').trim().toUpperCase();
  
    if (['GERENCIA','ADMIN','ADMINISTRADOR'].includes(r)) return 'admin';
    if (['PROMOTOR','PROMOTORA'].includes(r))           return 'promotor';
    if (['COORDINADOR','COORDINADORA','COORDINACION'].includes(r)) return 'coordinador';
    if (['LIDER','JEFE','SUPERVISOR'].includes(r))      return 'lider';
    if (['LOGISTICA','RUTAS','DELIVERY'].includes(r))   return 'logistica';
    if (['ASESOR','VENDEDOR','VENDEDORA'].includes(r))  return 'asesor';
  
    return 'unknown';
  }
  
  /* =========================
     Home por rol (redirect post-login)
     ========================= */
  export function getRoleHomeRoute(role: Role): string {
    switch (role) {
      case 'admin':       return ROUTES.DASH;
      case 'coordinador': return ROUTES.LOGISTICA;
      case 'lider':       return ROUTES.SALES_REPORT;
      case 'asesor':      return ROUTES.MI_RESUMEN;
      case 'promotor':    return ROUTES.MI_RESUMEN;
      case 'logistica':   return ROUTES.LOGISTICA;
      default:            return ROUTES.DASH;
    }
  }
  
  /* =========================
     Autorización por ruta (middleware/guards)
     ========================= */
     export function canAccessRoute(role: Role, path: string): boolean {
      if (role === 'admin') return true;

      // Rutas de promotores: prioriza subrutas específicas, luego permite a promotores su panel base.
     if (path.startsWith('/dashboard/promotores')) {
        if (/^\/dashboard\/promotores\/validacion(?:\/.*)?$/.test(path)) {
          return can(role, 'view:validacion-promotores');
        }
        if (/^\/dashboard\/promotores\/registro(?:\/.*)?$/.test(path)) {
          return can(role, 'view:registro-promotores');
        }
        if (/^\/dashboard\/promotores\/admin(?:\/.*)?$/.test(path)) {
          return can(role, 'view:resumen-promotores');
        }
        // Mis ventas de promotor (panel personal)
        return role === 'promotor' || can(role, 'view:resumen-promotores');
      }
      if (/^\/dashboard\/asesores\/validacion(?:\/.*)?$/.test(path)) {
        return can(role, 'view:validacion-asesores');
      }

      const routeCaps: { pattern: RegExp; cap: Cap }[] = [
        { pattern: /^\/dashboard\/sales-report(?:\/.*)?$/, cap: 'view:sales-report' },
        { pattern: /^\/dashboard\/vendedores(?:\/.*)?$/, cap: 'view:resumen-asesores' },
        { pattern: /^\/dashboard\/admin\/resumen(?:\/.*)?$/, cap: 'view:reporte-asistencia' },
        { pattern: /^\/logistica(?:\/.*)?$/, cap: 'view:logistica' },
        { pattern: /^\/dashboard\/asesores\/registro(?:\/.*)?$/, cap: 'view:registro-asesores' },
        { pattern: /^\/dashboard\/asesores\/devoluciones(?:\/.*)?$/, cap: 'view:devoluciones' },
        { pattern: /^\/dashboard\/inventario(?:\/.*)?$/, cap: 'view:inventario' },
        { pattern: /^\/asistencia(?:\/.*)?$/, cap: 'view:asistencia' },
        { pattern: /^\/dashboard\/asesores\/playbook-whatsapp(?:\/.*)?$/, cap: 'view:playbook' },
        { pattern: /^\/dashboard\/admin\/usuarios(?:\/.*)?$/, cap: 'view:users-admin' },
        { pattern: /^\/mi\/resumen(?:\/.*)?$/, cap: 'view:mi-resumen' },
      ];

      const hit = routeCaps.find(r => r.pattern.test(path));
      return hit ? can(role, hit.cap) : true;
    }
