-- Agrega columnas de validación para ventas de promotores
alter table public.promoter_sales
  add column if not exists approval_status text,
  add column if not exists approval_note text,
  add column if not exists approval_ticket text,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz;

-- Normaliza filas existentes: se marcan como aprobadas
update public.promoter_sales
  set approval_status = 'approved'
  where approval_status is null;

-- Reglas y defaults
alter table public.promoter_sales
  alter column approval_status set default 'pending',
  alter column approval_status set not null;

alter table public.promoter_sales
  add constraint promoter_sales_approval_status_check
  check (approval_status in ('pending','approved','rejected'));

create index if not exists idx_promoter_sales_approval_status
  on public.promoter_sales (approval_status);
