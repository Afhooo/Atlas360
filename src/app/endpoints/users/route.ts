import { NextResponse } from 'next/server';
import { type PostgrestError } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { buildLoginIndexes } from '@/lib/auth/login-normalize';
import { LoginIndexSupport, runWithLoginIndexFallback, type LoginIndexValues } from '@/lib/auth/login-index-support';
import { isDemoMode, demoUsers, demoSites } from '@/lib/demo/mockData';
import { supabaseAdmin } from '@/lib/supabase';

function getAdmin() {
  return supabaseAdmin();
}

function randomPassword(length = 10) {
  const chars = 'ABCDEFGHJKLmnopqrstuvwxyz23456789$%*!@#';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const errorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
};

const isMissingColumn = (error: PostgrestError | null, column: string) => {
  if (!error) return false;
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase());
};

const PEOPLE_SITE_CHECK = 'people_site_required_except_promotor';
const PEOPLE_ROLE_CHECK = 'people_role_check';
const ALLOWED_ROLES = [
  'ADMIN',
  'GERENCIA',
  'ADMINISTRADOR',
  'GERENTE',
  'COORDINADOR',
  'LIDER',
  'ASESOR',
  'VENDEDOR',
  'PROMOTOR',
  'LOGISTICA',
  'CAJERO',
] as const;
const loginIndexSupport = new LoginIndexSupport();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUUID = (value?: string | null) => Boolean(value && UUID_REGEX.test(value));

type BranchFilter =
  | { type: 'site'; siteId: string }
  | { type: 'legacy'; term: string }
  | { type: 'none' };

const parseBranchFilter = (raw: string): BranchFilter | null => {
  if (!raw) return null;
  if (raw === '__none__') return { type: 'none' };
  if (raw.startsWith('site:')) {
    const siteId = raw.slice(5).trim();
    if (siteId) return { type: 'site', siteId };
  }
  if (isUUID(raw)) {
    return { type: 'site', siteId: raw };
  }
  return { type: 'legacy', term: raw };
};

const normalizeBranchPayload = (input: Record<string, unknown>) => {
  const explicitSite = typeof input.site_id === 'string' ? input.site_id.trim() : null;
  const rawBranch = typeof input.branch_id === 'string' ? input.branch_id.trim() : null;
  const branchLabel = typeof input.branch_label === 'string' ? input.branch_label.trim() : null;
  const legacyLocal = typeof input.local === 'string' ? input.local.trim() : null;

  let site_id: string | null = explicitSite || null;
  if (!site_id && rawBranch && isUUID(rawBranch)) {
    site_id = rawBranch;
  }

  let local: string | null = null;
  if (branchLabel) {
    local = branchLabel;
  } else if (!site_id && rawBranch) {
    local = rawBranch;
  } else if (legacyLocal) {
    local = legacyLocal;
  }

  return { site_id, local };
};

type PeopleRow = {
  id: string;
  full_name: string | null;
  fenix_role: string | null;
  privilege_level: number | null;
  username: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
  branch_id: string | null;
  phone: string | null;
  vehicle_type: string | null;
  site_id: string | null;
};

const mapPeopleConstraintMessage = (error: PostgrestError) => {
  if (error.code === '23514' && error.message?.includes(PEOPLE_SITE_CHECK)) {
    return 'Sucursal es obligatoria para roles distintos de PROMOTOR. Selecciona una sucursal o usa el rol PROMOTOR.';
  }
  if (error.code === '23514' && error.message?.includes(PEOPLE_ROLE_CHECK)) {
    return `Rol inválido. Usa uno de: ${ALLOWED_ROLES.join(', ')}.`;
  }
  return null;
};

// GET /endpoints/users
export async function GET(req: Request) {
  try {
    const supabase = isDemoMode() ? null : getAdmin();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const role = (searchParams.get('role') || '').trim().toUpperCase();
    const branch = (searchParams.get('branch') || '').trim();
    const branchFilter = parseBranchFilter(branch);
    const activeParam = searchParams.get('active');
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (isDemoMode()) {
      let rows = [...demoUsers];

      if (q) {
        const term = q.toLowerCase();
        rows = rows.filter(
          (u) =>
            u.full_name?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term) ||
            u.username?.toLowerCase().includes(term)
        );
      }
      if (role) {
        rows = rows.filter((u) => u.fenix_role?.toUpperCase() === role);
      }
      if (activeParam === 'true') {
        rows = rows.filter((u) => u.active);
      }
      if (branchFilter) {
        rows = rows.filter((u) => {
          if (branchFilter.type === 'site') return u.site_id === branchFilter.siteId;
          if (branchFilter.type === 'legacy' && branchFilter.term) {
            return (u.branch_id || '').toLowerCase().includes(branchFilter.term.toLowerCase());
          }
          return true;
        });
      }

      const total = rows.length;
      const paged = rows.slice(from, to + 1).map((row) => ({
        ...row,
        site_name: row.site_id ? demoSites.find((s) => s.id === row.site_id)?.name ?? null : null,
      }));

      return NextResponse.json({ ok: true, data: paged, page, pageSize, total });
    }

    // NOTE: branch_id es alias de local
    const supabaseClient = supabase!;

    let query = supabaseClient
      .from('people')
      .select(
        `
        id,
        full_name,
        fenix_role,
        privilege_level,
        username,
        email,
        active,
        created_at,
        site_id,
        branch_id:local,
        phone,
        vehicle_type
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%,local.ilike.%${q}%,phone.ilike.%${q}%`
      );
    }
    if (role) query = query.eq('fenix_role', role);
    if (branchFilter?.type === 'none') {
      query = query.is('site_id', null).is('local', null);
    } else if (branchFilter?.type === 'site') {
      query = query
        .eq('site_id', branchFilter.siteId)
        // Excluimos promotores sin depender del casing ni del sufijo (PROMOTOR / PROMOTORA).
        .not('fenix_role', 'ilike', 'PROMOTOR%');
    } else if (branchFilter?.type === 'legacy') {
      query = query.ilike('local', `%${branchFilter.term}%`);
    }
    if (activeParam === 'true' || activeParam === 'false') query = query.eq('active', activeParam === 'true');

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const rows = (data ?? []) as PeopleRow[];
    const siteIds = Array.from(new Set(rows.map((row) => row.site_id).filter((id): id is string => Boolean(id))));
    const siteNameMap = new Map<string, string>();

    if (siteIds.length) {
      const { data: sites, error: siteErr } = await supabaseClient
      .from('sites')
      .select('id, name')
      .in('id', siteIds);

      if (siteErr) {
        console.warn('[users] site lookup failed:', siteErr);
      } else {
        sites?.forEach((site) => {
          if (site?.id) {
            siteNameMap.set(site.id, site.name?.trim() || site.id);
          }
        });
      }
    }

    const enriched = rows.map((row) => ({
      ...row,
      site_name: row.site_id ? siteNameMap.get(row.site_id) ?? null : null,
    }));

    return NextResponse.json({ ok: true, data: enriched, page, pageSize, total: count ?? 0 });
  } catch (err) {
    console.error('GET /endpoints/users error:', err);
    return NextResponse.json({ ok: false, error: errorMessage(err, 'List users failed') }, { status: 500 });
  }
}

// POST /endpoints/users
export async function POST(req: Request) {
  try {
    const supabase = getAdmin();
    const body = (await req.json()) as Record<string, unknown>;

    const full_name: string = String(body.full_name ?? '').trim();
    const fenix_role: string = String(body.fenix_role ?? 'USER').trim().toUpperCase();
    const privilege_level: number = Number(body.privilege_level ?? 1);
    const { site_id, local } = normalizeBranchPayload(body);
    const phone: string | null = typeof body.phone === 'string' ? body.phone.trim() || null : null;
    const vehicle_type: string | null = typeof body.vehicle_type === 'string'
      ? body.vehicle_type.trim() || null
      : null;

    if (!full_name) return NextResponse.json({ ok: false, error: 'full_name es requerido' }, { status: 400 });

    const userProvidedUsername = typeof body.username === 'string' && !!body.username.trim();
    const userProvidedEmail = typeof body.email === 'string' && !!body.email.trim();

    const base = full_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .replace(/\.$/, '');
    const domain = (process.env.LOGIN_DOMAIN || 'fenix.local').trim();

    const generateCredentials = () => {
      const suffix = Math.random().toString(16).slice(2, 6);
      const username = `${base}_${suffix}`.toLowerCase();
      const email = `${username}@${domain}`.toLowerCase();
      return { username, email };
    };

    const initialUsername = userProvidedUsername
      ? String(body.username).trim().toLowerCase()
      : generateCredentials().username;
    const initialEmail = userProvidedEmail
      ? String(body.email).trim().toLowerCase()
      : `${initialUsername}@${domain}`.toLowerCase();

    const plain = typeof body.password === 'string' && body.password.length >= 6
      ? body.password
      : randomPassword(10);
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(plain, salt);

    const buildLoginIndexValues = (u: string, e: string): LoginIndexValues => {
      const usernameIndexes = buildLoginIndexes(u);
      const emailIndexes = buildLoginIndexes(e);
      return {
        username_norm: usernameIndexes.norm,
        username_flat: usernameIndexes.flat,
        email_norm: emailIndexes.norm,
        email_flat: emailIndexes.flat,
      };
    };

    const basePayload: Record<string, unknown> = {
      full_name,
      fenix_role,
      role: fenix_role, // legacy columna role exige valor, mantenemos sincronía con fenix_role
      privilege_level,
      local,            // ← columna real
      site_id: site_id ?? null,
      phone,
      vehicle_type,
      username: initialUsername,
      email: initialEmail,
      active: true,
      password_hash,
      password: password_hash,
      initial_password_plain_text: plain,
    };

    let attemptUsername = initialUsername;
    let attemptEmail = initialEmail;
    let lastError: PostgrestError | null = null;

    for (let i = 0; i < 3; i++) {
      const loginIndexValues = buildLoginIndexValues(attemptUsername, attemptEmail);
      const { data, error } = await runWithLoginIndexFallback(
        loginIndexSupport,
        { ...basePayload, username: attemptUsername, email: attemptEmail },
        loginIndexValues,
        async (payload) => await supabase.from('people').insert(payload).select('*').single(),
        (column) => console.warn(`[users] people.${column} no existe. Reintentando sin ese campo.`)
      );

      if (!error) {
        return NextResponse.json({ ok: true, data });
      }

      const pgError = error as PostgrestError;
      lastError = pgError;

      if (
        'initial_password_plain_text' in basePayload &&
        isMissingColumn(pgError, 'initial_password_plain_text')
      ) {
        console.warn('[users] people.initial_password_plain_text no existe. Reintentando sin ese campo.');
        delete basePayload.initial_password_plain_text;
        continue;
      }

      if ('password_hash' in basePayload && isMissingColumn(pgError, 'password_hash')) {
        console.warn('[users] people.password_hash no existe. Reintentando sin ese campo.');
        delete basePayload.password_hash;
        continue;
      }

      if ('password' in basePayload && isMissingColumn(pgError, 'password')) {
        console.warn('[users] people.password no existe. Reintentando sin ese campo.');
        delete basePayload.password;
        continue;
      }

      if (pgError?.code === '23505') {
        // Si el usuario proporcionó username/email, no intentamos regenerar.
        if (userProvidedUsername || userProvidedEmail) {
          const { data: conflict } = await supabase
            .from('people')
            .select('id, full_name, username, email, active, fenix_role')
            .or(`username.eq.${attemptUsername},email.eq.${attemptEmail}`)
            .limit(1)
            .single();

          const state = conflict
            ? conflict.active
              ? 'activo'
              : 'inactivo'
            : null;
          const msg = conflict
            ? `Ya existe el usuario ${conflict.username || conflict.email} (${state}). Búscalo en Usuarios (incluye inactivos) o cambia usuario/correo.`
            : 'Username o email ya existen';
          throw new Error(msg);
        }

        // Si no fue provisto por el usuario, regeneramos credenciales y reintentamos.
        const regenerated = generateCredentials();
        attemptUsername = regenerated.username;
        attemptEmail = regenerated.email;
        continue;
      }

      const friendly = mapPeopleConstraintMessage(pgError);
      const msg = friendly ?? pgError?.message ?? 'Create user failed';
      throw new Error(msg);
    }

    // Si agotamos los intentos, devolvemos el último error conocido.
    if (lastError) {
      const friendly = mapPeopleConstraintMessage(lastError);
      throw new Error(friendly ?? lastError.message ?? 'Create user failed');
    }

    throw new Error('Create user failed');
  } catch (err) {
    console.error('POST /endpoints/users error:', err);
    const msg = errorMessage(err, 'Create user failed');
    const status = /ya existe el usuario|username o email ya existen/i.test(msg) ? 409 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
