// src/lib/auth/login-normalize.ts
/**
 * Reutilizable entre endpoints: normaliza usernames/emails para búsquedas tolerantes
 */
export function normalizeLoginInput(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@._+-]/g, '');
}

export function flattenLoginInput(normalized: string): string {
  return normalized.replace(/[._+-]/g, '');
}

export function buildLoginIndexes(raw: string) {
  const norm = normalizeLoginInput(raw);
  const flat = flattenLoginInput(norm);
  return { norm, flat };
}
