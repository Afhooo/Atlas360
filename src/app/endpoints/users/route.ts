import { NextResponse } from 'next/server';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { buildLoginIndexes } from '@/lib/auth/login-normalize';
import { LoginIndexSupport, runWithLoginIndexFallback, type LoginIndexValues } from '@/lib/auth/login-index-support';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabaseKey is required.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
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

const PEOPLE_SITE_CHECK = 'people_site_required_except_promotor';
const PEOPLE_ROLE_CHECK = 'people_role_check';
const ALLOWED_ROLES = ['ADMIN', 'GERENCIA', 'COORDINADOR', 'LIDER', 'ASESOR', 'PROMOTOR', 'LOGISTICA'] as const;
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
    const supabase = getAdmin();

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

    // NOTE: branch_id es alias de local
    let query = supabase
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
      const { data: sites, error: siteErr } = await supabase
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

    const basePayload = {
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
