# Atlas 360 – Guía rápida

## Visión
Atlas 360 es una plataforma modular para operar ventas, inventarios, RRHH, productividad y cajas desde un solo lugar, con una navegación consistente y permisos por rol.

## Módulos
- **Dashboard** (`/dashboard`): KPIs globales y listas recientes.
- **Ventas** (`/ventas`): registro, validación y análisis de ventas; devoluciones/notas.
- **Inventario** (`/inventario`): stock, movimientos/kardex y rotación.
- **RRHH** (`/rrhh`): marcajes, georreferencia (placeholder) y reportes.
- **Productividad** (`/productividad`): horas efectivas y métricas por persona/local.
- **Cajas** (`/cajas`): aperturas, cierres y cuadraturas.
- **Configuración** (`/configuracion`): usuarios, roles, locales y parámetros.

## Navegación
- **Sidebar**: agrupado por Operación, Finanzas, Personas y Configuración.
- **Topbar**: título de vista, nombre de negocio y usuario actual.
- Layout común en `src/components/shell/AppShell.tsx`, consumido por cada `layout.tsx` de módulo.

## Permisos y flags
- Flags de módulos en `src/lib/config/featureFlags.ts` (activar/desactivar secciones).
- Permisos por rol en `src/lib/auth/permissions.ts`. Roles actuales: `admin`, `coordinador`, `lider`, `asesor`, `promotor`, `logistica`.
- El Sidebar y AppShell verifican flags + permisos antes de mostrar módulos.

## Mock data y vistas reales
- Datos de ejemplo centralizados en `src/lib/demo/mockData.ts` (ventas, inventario, asistencia, productividad, cajas, usuarios).
- Vistas de módulos usan endpoints existentes (si responden) y caen a mocks para verse “reales”.

## Archivos clave
- AppShell: `src/components/shell/AppShell.tsx`.
- Sidebar: `src/components/nav/Sidebar.tsx`.
- Layouts por módulo: `src/app/{dashboard,ventas,inventario,rrhh,productividad,cajas,configuracion}/layout.tsx`.
- Páginas de módulos: `src/app/{ventas,inventario,rrhh,productividad,cajas,configuracion}/page.tsx` y `src/app/configuracion/usuarios/page.tsx`.

## Cómo activar/desactivar módulos
Edita `src/lib/config/featureFlags.ts` y coloca `true/false` por módulo. El Sidebar y las vistas respetan ese flag sin romper rutas existentes.

## Extender y conectar datos
- Reemplaza mocks en `src/lib/demo/mockData.ts` con hooks/endpoints reales por módulo.
- Las tablas usan clases existentes (glass-card, apple-*) para mantener el estilo SaaS actual.
