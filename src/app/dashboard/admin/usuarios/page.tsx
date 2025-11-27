'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Search,
  Shield,
  Mail,
  Phone,
  Building2,
  UserRound,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  Car,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { Input } from '@/components/Input';
import { cn } from '@/lib/utils/cn';

/* ==========================================================================
   Tipos
   ========================================================================= */

type UserRow = {
  id: string;
  full_name: string;
  fenix_role: string | null;
  privilege_level: number | null;
  username: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
  branch_id: string | null;
  site_id: string | null;
  site_name: string | null;
  phone: string | null;
  vehicle_type: string | null;
  initial_password_plain_text?: string | null;
};

type UsersResponse = {
  ok: boolean;
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

type BaseResponse = {
  ok?: boolean;
  error?: string | null;
};

type Site = {
  id: string;
  name: string;
};

type BranchOption = {
  key: string;
  value: string;
  filterValue: string;
  label: string;
  source: 'site' | 'people' | 'manual';
  kind: 'site' | 'legacy';
};

/* ==========================================================================
   Constantes y helpers
   ========================================================================= */

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Administración' },
  { value: 'GERENCIA', label: 'Gerencia' },
  { value: 'COORDINADOR', label: 'Coordinación' },
  { value: 'LIDER', label: 'Liderazgo' },
  { value: 'ASESOR', label: 'Asesor' },
  { value: 'PROMOTOR', label: 'Promotor' },
  { value: 'LOGISTICA', label: 'Logística' },
];

const PRIVILEGE_OPTIONS = [1, 2, 3, 4, 5];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
];

const NO_BRANCH_OPTION = '__none__';
const SITE_FILTER_PREFIX = 'site:';

const fetcher = async (url: string): Promise<UsersResponse> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Fallo al cargar usuarios (${res.status})`);
  }
  const json: UsersResponse = await res.json();
  if (!json.ok) {
    throw new Error(json.error || 'No se pudo obtener la lista de usuarios');
  }
  return json;
};

const fetchSites = async (): Promise<Site[]> => {
  const res = await fetch('/endpoints/sites');
  if (!res.ok) {
    console.error('[usuarios] No se pudieron cargar las sucursales', res.status);
    return [];
  }
  const json = (await res.json()) as { ok?: boolean; results?: Site[] };
  if (!json.ok || !Array.isArray(json.results)) return [];
  return json.results;
};

const fmtDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const roleLabel = (value?: string | null) => {
  if (!value) return '—';
  const upper = value.toUpperCase();
  return ROLE_OPTIONS.find((r) => r.value === upper)?.label ?? upper;
};

const randomPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789$%*!@#';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const getUserBranchLabel = (user: UserRow) => user.site_name || user.branch_id || 'Sin sucursal';

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
};

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-apple-caption font-medium',
      active
        ? 'bg-apple-green-500/20 border border-apple-green-500/40 text-apple-green-300'
        : 'bg-apple-red-500/15 border border-apple-red-500/40 text-apple-red-300'
    )}
  >
    {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
    {active ? 'Activo' : 'Inactivo'}
  </span>
);

const EmptyState = () => (
  <div className="py-16 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
      <UserRound size={24} className="text-apple-gray-400" />
    </div>
    <p className="apple-h4 text-white">Sin usuarios</p>
    <p className="apple-body text-apple-gray-400">
      Ajusta los filtros o crea un nuevo usuario para comenzar.
    </p>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex items-center gap-3 text-apple-gray-300">
      <Loader2 size={20} className="animate-spin" />
      <span className="apple-body">Cargando usuarios...</span>
    </div>
  </div>
);

type DetailTileProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
};

const DetailTile = ({ icon, label, children }: DetailTileProps) => (
  <div className="rounded-apple border border-white/5 bg-white/[0.02] p-3 text-white/90">
    <div className="apple-caption flex items-center gap-2 text-apple-gray-400">
      {icon}
      {label}
    </div>
    <div className="apple-body mt-1 text-white">{children}</div>
  </div>
);

/* ==========================================================================
   Página principal
   ========================================================================= */

export default function AdminUsuariosPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (roleFilter !== 'all') params.set('role', roleFilter.toUpperCase());
    if (statusFilter === 'active') params.set('active', 'true');
    if (statusFilter === 'inactive') params.set('active', 'false');
    if (branchFilter !== 'all') params.set('branch', branchFilter);
    return params.toString();
  }, [page, pageSize, debouncedSearch, roleFilter, statusFilter, branchFilter]);

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    `/endpoints/users?${queryString}`,
    fetcher,
    { keepPreviousData: true }
  );

  const total = data?.total ?? 0;
  const rows = useMemo(() => data?.data ?? [], [data]);
  const pageActive = rows.filter((user) => user.active).length;
  const pageInactive = Math.max(0, rows.length - pageActive);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, branchFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /* === Estado de formularios === */
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<UserRow | null>(null);
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);
  const [createAttempted, setCreateAttempted] = useState(false);
  const [customBranchMode, setCustomBranchMode] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    fenix_role: 'ASESOR',
    email: '',
    username: '',
    privilege_level: 1,
    branch_id: '',
    branch_label: '',
    phone: '',
    vehicle_type: '',
    password: '',
  });

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    fenix_role: 'ASESOR',
    privilege_level: 1,
    branch_id: '',
    branch_label: '',
    phone: '',
    vehicle_type: '',
    active: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editCustomBranchMode, setEditCustomBranchMode] = useState(false);

  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const branchIsRequired = createForm.fenix_role !== 'PROMOTOR';
  const branchHasError = branchIsRequired && !createForm.branch_id.trim() && createAttempted;

  const { data: sites } = useSWR<Site[]>('/endpoints/sites', fetchSites);
  const branchOptions = useMemo<BranchOption[]>(() => {
    const map = new Map<string, BranchOption>();
    const hasSites = (sites?.length ?? 0) > 0;

    const addSiteOption = (
      value?: string | null,
      label?: string | null,
      source: BranchOption['source'] = 'site'
    ) => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      const key = `${SITE_FILTER_PREFIX}${trimmed}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        if ((!existing.label || existing.label === existing.value) && label?.trim()) {
          map.set(key, { ...existing, label: label.trim() });
        }
        return;
      }
      map.set(key, {
        key,
        value: trimmed,
        label: label?.trim() || trimmed,
        filterValue: `${SITE_FILTER_PREFIX}${trimmed}`,
        source,
        kind: 'site',
      });
    };

    const addLegacyOption = (
      value?: string | null,
      label?: string | null,
      source: BranchOption['source'] = 'people'
    ) => {
      const trimmedValue = value?.trim();
      if (!trimmedValue) return;
      const key = `legacy:${trimmedValue.toLowerCase()}`;
      if (map.has(key)) return;
      map.set(key, {
        key,
        value: trimmedValue,
        label: label?.trim() || trimmedValue,
        filterValue: trimmedValue,
        source,
        kind: 'legacy',
      });
    };

    (sites ?? []).forEach((site) => addSiteOption(site?.id, site?.name, 'site'));

    // Plan B: si tenemos sites, NO agregamos legacy branch_id para evitar duplicados; si no hay sites, usamos branch_id como fallback.
    if (!hasSites) {
      rows.forEach((user) => {
        if (user.branch_id) {
          addLegacyOption(user.branch_id, user.branch_id, 'people');
        }
      });
    } else {
      rows.forEach((user) => {
        if (user.site_id) {
          addSiteOption(user.site_id, user.site_name ?? user.branch_id ?? user.site_id, 'people');
        }
      });
    }

    if (createdUser) {
      const createdLocal =
        (createdUser as unknown as { local?: string | null })?.local ??
        createdUser.branch_id ??
        null;

      if (createdUser.site_id) {
        addSiteOption(
          createdUser.site_id,
          createdUser.site_name ?? createdLocal ?? createdUser.site_id,
          'people'
        );
      } else if (createdLocal) {
        addLegacyOption(createdLocal, createdLocal, 'people');
      }
    }

    if (branchFilter !== 'all' && branchFilter !== NO_BRANCH_OPTION && branchFilter) {
      if (branchFilter.startsWith(SITE_FILTER_PREFIX)) {
        const siteId = branchFilter.slice(SITE_FILTER_PREFIX.length);
        addSiteOption(siteId, siteId, 'manual');
      } else {
        addLegacyOption(branchFilter, branchFilter, 'manual');
      }
    }

    const weight = (opt: BranchOption) => {
      if (opt.kind === 'site') return 3;
      if (opt.source === 'manual') return 2;
      return 1; // legacy/people
    };

    const bestByLabel = new Map<string, BranchOption>();
    Array.from(map.values()).forEach((opt) => {
      const labelNorm = (opt.label || opt.value || '').trim().toLowerCase();
      if (!labelNorm) return;
      const prev = bestByLabel.get(labelNorm);
      if (!prev || weight(opt) > weight(prev)) {
        bestByLabel.set(labelNorm, opt);
      }
    });

    return Array.from(bestByLabel.values())
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [rows, sites, createdUser, branchFilter]);

  useEffect(() => {
    if (!branchOptions.length) {
      setCustomBranchMode(true);
    }
  }, [branchOptions.length]);

  useEffect(() => {
    if (!branchOptions.length) {
      setEditCustomBranchMode(true);
    }
  }, [branchOptions.length]);

  useEffect(() => {
    if (!editingUser) {
      setEditCustomBranchMode(false);
    }
  }, [editingUser]);

  const hasCurrentBranchOption = useMemo(
    () => branchOptions.some((option) => option.value === createForm.branch_id),
    [branchOptions, createForm.branch_id]
  );

  const editHasCurrentBranchOption = useMemo(
    () => branchOptions.some((option) => option.value === editForm.branch_id),
    [branchOptions, editForm.branch_id]
  );

  const openCreate = () => {
    setCreatedUser(null);
    setShowCreateAdvanced(false);
    setCreateAttempted(false);
    setCustomBranchMode(branchOptions.length === 0);
    const preferredOption =
      branchFilter !== 'all' && branchFilter !== NO_BRANCH_OPTION
        ? branchOptions.find((option) => option.filterValue === branchFilter)
        : branchOptions[0];
    setCreateForm({
      full_name: '',
      fenix_role: 'ASESOR',
      email: '',
      username: '',
      privilege_level: 1,
      branch_id: preferredOption?.value ?? '',
      branch_label: preferredOption?.label ?? '',
      phone: '',
      vehicle_type: '',
      password: '',
    });
    setCreateOpen(true);
  };

  const handleCreate = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setCreateAttempted(true);
    setCreateLoading(true);
    setCreatedUser(null);
    try {
      const branchIdValue = createForm.branch_id.trim();
      const branchLabelValue = createForm.branch_label.trim();
      const payload = {
        full_name: createForm.full_name.trim(),
        fenix_role: createForm.fenix_role.trim(),
        email: createForm.email.trim() || undefined,
        username: createForm.username.trim() || undefined,
        privilege_level: Number(createForm.privilege_level) || 1,
        branch_id: branchIdValue || null,
        branch_label: branchLabelValue || null,
        phone: createForm.phone.trim() || null,
        vehicle_type: createForm.vehicle_type.trim() || null,
        password: createForm.password.trim() || undefined,
      };

      if (!payload.full_name) {
        toast.error('El nombre completo es obligatorio');
        return;
      }

      if (payload.fenix_role !== 'PROMOTOR' && !payload.branch_id) {
        toast.error('Selecciona una sucursal para este rol.');
        return;
      }

      const res = await fetch('/endpoints/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as BaseResponse & { data?: UserRow };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Fallo al crear usuario (${res.status})`);
      }

      const rawCreated = (json.data ?? null) as (UserRow & { local?: string | null }) | null;
      const normalizedCreated = rawCreated
        ? ({
            ...rawCreated,
            branch_id: rawCreated.branch_id ?? rawCreated.local ?? null,
            site_id: rawCreated.site_id ?? null,
            site_name: rawCreated.site_name ?? null,
          } satisfies UserRow)
        : null;
      setCreatedUser(normalizedCreated);
      setCreateAttempted(false);
      toast.success('Usuario creado correctamente');
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear el usuario'));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (user: UserRow) => {
    const branchValue = user.site_id ?? user.branch_id ?? '';
    const branchLabel = user.site_name ?? user.branch_id ?? '';
    const hasOption = branchOptions.some((option) => option.value === branchValue);
    setEditCustomBranchMode(branchOptions.length === 0 || (!!branchValue && !hasOption));
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name ?? '',
      email: user.email ?? '',
      fenix_role: (user.fenix_role || 'ASESOR').toUpperCase(),
      privilege_level: user.privilege_level ?? 1,
      branch_id: branchValue,
      branch_label: branchLabel,
      phone: user.phone ?? '',
      vehicle_type: user.vehicle_type ?? '',
      active: user.active,
    });
  };

  const handleEdit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    try {
      const branchIdValue = editForm.branch_id.trim();
      const branchLabelValue = editForm.branch_label.trim();
      const payload = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        fenix_role: editForm.fenix_role.trim(),
        privilege_level: Number(editForm.privilege_level) || 1,
        branch_id: branchIdValue || null,
        branch_label: branchLabelValue || null,
        phone: editForm.phone.trim() || null,
        vehicle_type: editForm.vehicle_type.trim() || null,
        active: !!editForm.active,
      };

      const res = await fetch(`/endpoints/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as BaseResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `No se pudo actualizar (${res.status})`);
      }

      toast.success('Usuario actualizado');
      setEditingUser(null);
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al actualizar'));
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (user: UserRow) => {
    try {
      const res = await fetch(`/endpoints/users/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      const json = (await res.json()) as BaseResponse & { active?: boolean };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `No se pudo actualizar (${res.status})`);
      }
      toast.success(json.active ? 'Usuario activado' : 'Usuario desactivado');
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el estado'));
    }
  };

  const openReset = (user: UserRow) => {
    setResetTarget(user);
    setResetPassword(randomPassword(10));
    setShowPassword(false);
  };

  const handleReset = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!resetTarget) return;
    const pwd = resetPassword.trim();
    if (pwd.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`/endpoints/users/${resetTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', newPassword: pwd }),
      });
      const json = (await res.json()) as BaseResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `No se pudo actualizar (${res.status})`);
      }

      toast.success('Contraseña restablecida');
      setResetTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo restablecer la contraseña'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/endpoints/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as BaseResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `No se pudo eliminar (${res.status})`);
      }
      toast.success('Usuario eliminado');
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo eliminar el usuario'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copiado al portapapeles');
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo copiar'));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="apple-h1 text-white">Usuarios</h1>
          <p className="apple-body text-apple-gray-400">
            Administra las cuentas y accesos del sistema Atlas 360.
          </p>
        </div>
        <Button leftIcon={<UserPlus size={18} />} onClick={openCreate}>
          Nuevo usuario
        </Button>
      </header>

      <section className="glass-card space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative md:col-span-2 xl:col-span-2">
            <span className="sr-only">Buscar</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-400"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o sucursal"
              className="pl-9"
            />
          </label>
          <label>
            <span className="apple-caption mb-1 block text-apple-gray-400">Rol</span>
            <select
              className="input-apple w-full"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="apple-caption mb-1 block text-apple-gray-400">Estado</span>
            <select
              className="input-apple w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="apple-caption mb-1 block text-apple-gray-400">Sucursal</span>
            <select
              className="input-apple w-full"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              {branchOptions.map((option) => (
                <option key={`filter-${option.key}`} value={option.filterValue}>
                  {option.label}
                </option>
              ))}
              <option value={NO_BRANCH_OPTION}>Sin sucursal</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-apple-caption">
            <span className="rounded-full border border-white/10 px-3 py-1 text-apple-gray-100">
              {total.toLocaleString('es-BO')} usuarios totales
            </span>
            <span className="rounded-full border border-apple-green-400/50 bg-apple-green-500/10 px-3 py-1 text-apple-green-200">
              Activos en vista: {pageActive}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-apple-gray-300">
              Inactivos en vista: {pageInactive}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={16} />}
              onClick={() => mutate()}
            >
              Recargar
            </Button>
            <div className="apple-caption text-apple-gray-400">
              Página {page} de {totalPages}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card space-y-5 p-4 sm:p-6">
        {isLoading && <LoadingState />}
        {!isLoading && rows.length === 0 && <EmptyState />}
        {!isLoading && rows.length > 0 && (
          <>
            <div className="space-y-4">
              {rows.map((user) => (
                <article
                  key={user.id}
                  className="rounded-apple border border-white/5 bg-white/[0.02] p-4 sm:p-5 shadow-apple-sm transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="apple-h4 text-white">{user.full_name || 'Sin nombre'}</p>
                        <StatusBadge active={user.active} />
                        <span className="rounded-full bg-white/5 px-3 py-1 text-apple-caption text-white/80">
                          Nivel {user.privilege_level ?? '—'}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-apple-caption text-apple-gray-400">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
                          <Shield size={14} />
                          {user.username || '—'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
                          {roleLabel(user.fenix_role)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
                          Creado {fmtDate(user.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-apple-caption text-apple-gray-400">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                        <Building2 size={14} />
                        {getUserBranchLabel(user)}
                      </span>
                      {user.vehicle_type && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                          Vehículo: {user.vehicle_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DetailTile icon={<Mail size={16} />} label="Correo">
                      {user.email || 'Sin correo'}
                    </DetailTile>
                    <DetailTile icon={<Phone size={16} />} label="Teléfono">
                      {user.phone || 'Sin teléfono'}
                    </DetailTile>
                    <DetailTile icon={<Building2 size={16} />} label="Sucursal">
                      {getUserBranchLabel(user)}
                    </DetailTile>
                    <DetailTile icon={<Car size={16} />} label="Vehículo">
                      {user.vehicle_type || 'No registrado'}
                    </DetailTile>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Pencil size={16} />}
                      onClick={() => openEdit(user)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<KeyRound size={16} />}
                      onClick={() => openReset(user)}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={user.active ? <EyeOff size={16} /> : <Eye size={16} />}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.active ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 size={16} />}
                      onClick={() => setDeleteTarget(user)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-apple-caption text-apple-gray-400">
              <div className="inline-flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-white/80">
                  Mostrando {rows.length} usuarios
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1 text-apple-green-200">
                  Activos {pageActive}
                </span>
                {pageInactive > 0 && (
                  <span className="rounded-full border border-white/10 px-3 py-1 text-apple-red-200">
                    Inactivos {pageInactive}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
        {error && (
          <div className="rounded-apple border border-apple-red-500/40 bg-apple-red-500/10 p-4 text-apple-red-200">
            {error.message}
          </div>
        )}
      </section>

      {/* === Modal crear === */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} size="lg">
        <form onSubmit={handleCreate}>
          <ModalHeader>
            <div>
              <h2 className="apple-h3 text-white">Nuevo usuario</h2>
              <p className="apple-caption text-apple-gray-400">
                Solo pedimos lo necesario: el sistema completa usuario, correo y contraseña si los dejas en blanco.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <div className="rounded-apple border border-white/5 bg-white/[0.03] p-4 text-white/80">
              <p className="apple-body mb-1">Datos mínimos</p>
              <p className="apple-caption text-apple-gray-300">
                Si no especificas usuario, correo o contraseña, el sistema los generará automáticamente con el dominio
                configurado en Atlas 360.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 rounded-apple border border-white/5 bg-white/[0.02] p-3">
                <span className="apple-caption text-apple-gray-300">Nombre completo *</span>
                <Input
                  required
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Ej. Ana María Pérez"
                />
              </label>
              <label className="space-y-2 rounded-apple border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="apple-caption text-apple-gray-300">Rol</span>
                  <span className="apple-caption text-apple-gray-500">Define permisos</span>
                </div>
                <select
                  className="input-apple"
                  value={createForm.fenix_role}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, fenix_role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className={cn(
                  'space-y-2 rounded-apple border p-3 sm:col-span-2',
                  branchHasError ? 'border-apple-red-500/60 bg-apple-red-500/5' : 'border-white/5 bg-white/[0.02]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="apple-caption text-apple-gray-300">Sucursal asignada</span>
                  <span
                    className={cn(
                      'apple-caption',
                      branchHasError ? 'text-apple-red-300' : 'text-apple-gray-500'
                    )}
                  >
                    {branchIsRequired ? 'Requerida para este rol' : 'Opcional para Promotor'}
                  </span>
                </div>
                {!customBranchMode && branchOptions.length > 0 ? (
                  <select
                    className={cn(
                      'input-apple',
                      branchHasError &&
                        'border-apple-red-500/60 focus-visible:ring-apple-red-500 focus-visible:border-apple-red-500'
                    )}
                    value={createForm.branch_id || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      const option = branchOptions.find((opt) => opt.value === value);
                      setCreateForm((prev) => ({
                        ...prev,
                        branch_id: value,
                        branch_label: option?.label ?? value,
                      }));
                    }}
                  >
                    <option value="" disabled>
                      Selecciona una sucursal
                    </option>
                    {!hasCurrentBranchOption && createForm.branch_id && (
                      <option value={createForm.branch_id}>
                        {createForm.branch_label || createForm.branch_id}
                      </option>
                    )}
                    {branchOptions.map((option) => {
                      return (
                        <option key={option.key} value={option.value}>
                          {option.label}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <Input
                    value={createForm.branch_label}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        branch_id: e.target.value,
                        branch_label: e.target.value,
                      }))
                    }
                    placeholder="Escribe el nombre o dirección"
                    className={cn(
                      branchHasError &&
                        'border-apple-red-500/60 focus-visible:ring-apple-red-500 focus-visible:border-apple-red-500'
                    )}
                  />
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {branchOptions.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCustomBranchMode((prev) => {
                          const next = !prev;
                          if (!next && branchOptions.length > 0) {
                            setCreateForm((prevForm) => {
                              const exists = branchOptions.some((opt) => opt.value === prevForm.branch_id);
                              if (exists) return prevForm;
                              return {
                                ...prevForm,
                                branch_id: branchOptions[0].value,
                                branch_label: branchOptions[0].label,
                              };
                            });
                          }
                          return next;
                        })
                      }
                    >
                      {customBranchMode ? 'Usar la lista de sucursales' : 'Escribir manualmente'}
                    </Button>
                  ) : (
                    <span className="apple-caption text-apple-gray-500">
                      No hay sucursales sugeridas, escribe el nombre manualmente.
                    </span>
                  )}
                </div>
                {branchHasError && (
                  <p className="apple-caption text-apple-red-300">
                    Selecciona una sucursal o cambia el rol a Promotor.
                  </p>
                )}
              </label>
            </div>

            <div className="rounded-apple border border-white/5 bg-white/[0.02] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="apple-body text-white">Datos opcionales</p>
                  <p className="apple-caption text-apple-gray-400">
                    Personaliza credenciales o contacto solo si lo necesitas.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateAdvanced((prev) => !prev)}
                >
                  {showCreateAdvanced ? 'Ocultar extras' : 'Agregar detalles'}
                </Button>
              </div>

              {showCreateAdvanced && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="apple-caption text-apple-gray-300">Correo electrónico</span>
                      <Input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Se completa solo si lo necesitas"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="apple-caption text-apple-gray-300">Usuario</span>
                      <Input
                        value={createForm.username}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                        placeholder="Se genera automáticamente"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="apple-caption text-apple-gray-300">Contraseña inicial</span>
                      <div className="flex gap-2">
                        <Input
                          value={createForm.password}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="Si se deja vacío se creará una aleatoria"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setCreateForm((prev) => ({ ...prev, password: randomPassword(12) }))}
                        >
                          Generar
                        </Button>
                      </div>
                    </label>
                    <label className="space-y-1">
                      <span className="apple-caption text-apple-gray-300">Nivel de privilegio</span>
                      <select
                        className="input-apple"
                        value={createForm.privilege_level}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, privilege_level: Number(e.target.value) }))}
                      >
                        {PRIVILEGE_OPTIONS.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Nivel {lvl}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="apple-caption text-apple-gray-300">Teléfono</span>
                      <Input
                        value={createForm.phone}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Ej. 70000000"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="apple-caption text-apple-gray-300">Tipo de vehículo</span>
                      <Input
                        value={createForm.vehicle_type}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, vehicle_type: e.target.value }))}
                        placeholder="Motocicleta, automóvil, etc."
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {createdUser && (
              <div className="rounded-apple border border-apple-green-500/40 bg-apple-green-500/10 p-4 text-apple-body text-white">
                <p className="mb-2 font-semibold">Credenciales generadas</p>
                <div className="space-y-2 apple-caption text-white/80">
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-apple-gray-400">Usuario</div>
                    <div className="font-medium">
                      {createdUser.username}
                    </div>
                    {createdUser.username && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.username || '')}
                      >
                        Copiar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-apple-gray-400">Correo</div>
                    <div className="font-medium">
                      {createdUser.email}
                    </div>
                    {createdUser.email && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.email || '')}
                      >
                        Copiar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-apple-gray-400">Contraseña</div>
                    <div className="font-medium">
                      {createdUser.initial_password_plain_text || '—'}
                    </div>
                    {createdUser.initial_password_plain_text && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(createdUser.initial_password_plain_text || '')}
                      >
                        Copiar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cerrar
            </Button>
            <Button type="submit" loading={createLoading}>
              Guardar usuario
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* === Modal editar === */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} size="lg">
        <form onSubmit={handleEdit}>
          <ModalHeader>
            <div>
              <h2 className="apple-h3 text-white">Editar usuario</h2>
              <p className="apple-caption text-apple-gray-400">
                Actualiza los datos básicos del usuario seleccionado.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Nombre completo</span>
                <Input
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Correo electrónico</span>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Rol</span>
                <select
                  className="input-apple"
                  value={editForm.fenix_role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fenix_role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Nivel de privilegio</span>
                <select
                  className="input-apple"
                  value={editForm.privilege_level}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, privilege_level: Number(e.target.value) }))}
                >
                  {PRIVILEGE_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Nivel {lvl}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Sucursal</span>
                {!editCustomBranchMode && branchOptions.length > 0 ? (
                  <select
                    className="input-apple"
                    value={editForm.branch_id}
                    onChange={(e) => {
                      const value = e.target.value;
                      const option = branchOptions.find((opt) => opt.value === value);
                      setEditForm((prev) => ({
                        ...prev,
                        branch_id: value,
                        branch_label: option?.label ?? value,
                      }));
                    }}
                  >
                    <option value="">Sin sucursal</option>
                    {!editHasCurrentBranchOption && editForm.branch_id && (
                      <option value={editForm.branch_id}>
                        {editForm.branch_label || editForm.branch_id}
                      </option>
                    )}
                    {branchOptions.map((option) => (
                      <option key={`edit-${option.key}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={editForm.branch_label}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        branch_id: e.target.value,
                        branch_label: e.target.value,
                      }))
                    }
                    placeholder="Escribe el nombre o dirección"
                  />
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {branchOptions.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditCustomBranchMode((prev) => {
                          const next = !prev;
                          if (!next && branchOptions.length > 0) {
                            setEditForm((prevForm) => {
                              const exists = branchOptions.some((opt) => opt.value === prevForm.branch_id);
                              if (exists) return prevForm;
                              return {
                                ...prevForm,
                                branch_id: branchOptions[0].value,
                                branch_label: branchOptions[0].label,
                              };
                            });
                          }
                          return next;
                        })
                      }
                    >
                      {editCustomBranchMode ? 'Usar la lista de sucursales' : 'Escribir manualmente'}
                    </Button>
                  ) : (
                    <span className="apple-caption text-apple-gray-500">
                      No hay sucursales sugeridas, escribe manualmente.
                    </span>
                  )}
                </div>
              </label>
              <label className="space-y-1">
                <span className="apple-caption text-apple-gray-300">Teléfono</span>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
            </div>
            <label className="space-y-1">
              <span className="apple-caption text-apple-gray-300">Tipo de vehículo</span>
              <Input
                value={editForm.vehicle_type}
                onChange={(e) => setEditForm((prev) => ({ ...prev, vehicle_type: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent"
                checked={editForm.active}
                onChange={(e) => setEditForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              <span className="apple-body text-apple-gray-200">Usuario activo</span>
            </label>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={editLoading}>
              Guardar cambios
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* === Modal reset password === */}
      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} size="md">
        <form onSubmit={handleReset}>
          <ModalHeader>
            <div>
              <h2 className="apple-h3 text-white">Restablecer contraseña</h2>
              <p className="apple-caption text-apple-gray-400">
                Nueva contraseña para {resetTarget?.full_name || 'usuario'}.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <label className="space-y-1">
              <span className="apple-caption text-apple-gray-300">Contraseña nueva</span>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={resetPassword}
                  minLength={6}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setResetPassword(randomPassword(12))}
                >
                  Generar
                </Button>
              </div>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              <span className="apple-caption text-apple-gray-300">Mostrar contraseña</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              onClick={() => copyToClipboard(resetPassword)}
              leftIcon={<KeyRound size={16} />}
            >
              Copiar contraseña
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={resetLoading}>
              Restablecer
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* === Modal eliminar === */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
        <ModalHeader>
          <div>
            <h2 className="apple-h3 text-white">Eliminar usuario</h2>
            <p className="apple-caption text-apple-gray-400">
              Esta acción no se puede deshacer. Confirma para eliminar definitivamente a {deleteTarget?.full_name}.
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="rounded-apple border border-apple-red-500/30 bg-apple-red-500/10 p-4 text-apple-body text-apple-red-200">
            Se perderá el acceso y los datos vinculados al usuario.
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>
            Eliminar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
