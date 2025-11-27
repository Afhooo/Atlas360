// src/lib/auth/env.ts

/**
 * Configuración compartida para autenticación (Node y Middleware)
 */
const RAW_JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXT_PUBLIC_JWT_SECRET ||
  'dev-secret';

const RAW_SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || 'fenix_session';
const RAW_SESSION_DAYS = Number(process.env.SESSION_DAYS || '30');

export const authEnv = {
  jwtSecret: RAW_JWT_SECRET,
  sessionCookieName: RAW_SESSION_COOKIE,
  sessionDays: Number.isFinite(RAW_SESSION_DAYS) ? RAW_SESSION_DAYS : 30,
  usingFallbackSecret: !process.env.JWT_SECRET && !process.env.NEXT_PUBLIC_JWT_SECRET,
} as const;

// En cualquier entorno, si estamos usando el secreto por defecto,
// solo avisamos por consola y NO rompemos el build. Esto permite
// demos en Vercel sin configurar JWT_SECRET explícito.
if (authEnv.usingFallbackSecret) {
  console.warn(
    '[auth/env] JWT_SECRET no definido, usando clave de desarrollo. ' +
      'Configura JWT_SECRET en variables de entorno para entornos productivos reales.'
  );
}
