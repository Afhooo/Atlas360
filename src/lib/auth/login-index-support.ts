import type { PostgrestError } from '@supabase/supabase-js';

export const LOGIN_INDEX_FIELDS = ['username_norm', 'username_flat', 'email_norm', 'email_flat'] as const;
export type LoginIndexField = (typeof LOGIN_INDEX_FIELDS)[number];
export type LoginIndexValues = Partial<Record<LoginIndexField, string>>;

export class LoginIndexSupport {
  private support: Partial<Record<LoginIndexField, boolean>> = {};

  pick(values: LoginIndexValues) {
    const selected: Record<string, string> = {};
    for (const field of LOGIN_INDEX_FIELDS) {
      const value = values[field];
      if (!value) continue;
      if (this.support[field] !== false) {
        selected[field] = value;
      }
    }
    return selected;
  }

  markMissingFromError(error: PostgrestError | null): LoginIndexField | null {
    if (!error) return null;
    const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
    for (const field of LOGIN_INDEX_FIELDS) {
      if (text.includes(field.toLowerCase())) {
        this.support[field] = false;
        return field;
      }
    }
    return null;
  }

  hasValues(values: LoginIndexValues) {
    return LOGIN_INDEX_FIELDS.some((field) => Boolean(values[field]));
  }
}

export async function runWithLoginIndexFallback<T>(
  support: LoginIndexSupport,
  basePayload: Record<string, unknown>,
  values: LoginIndexValues,
  exec: (payload: Record<string, unknown>) => Promise<{ data: T | null; error: PostgrestError | null }>,
  onColumnDisabled?: (column: LoginIndexField) => void
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const hasIndexValues = support.hasValues(values);
  let remainingRetries = hasIndexValues ? LOGIN_INDEX_FIELDS.length : 0;

  while (true) {
    const payload = { ...basePayload, ...support.pick(values) };
    const { data, error } = await exec(payload);
    if (!error) {
      return { data, error: null };
    }

    if (remainingRetries > 0) {
      const missing = support.markMissingFromError(error);
      if (missing) {
        remainingRetries -= 1;
        onColumnDisabled?.(missing);
        continue;
      }
    }

    return { data: null, error };
  }
}
