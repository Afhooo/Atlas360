-- supabase/migrations/20250302123000_create_delivery_survey_tables.sql
-- Esquema para tokens y respuestas de encuestas post-entrega

create table if not exists public.delivery_survey_links (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  survey_token text not null unique,
  customer_phone text,
  customer_name text,
  send_status text not null default 'pending', -- pending | sent | failed | completed
  send_error text,
  whatsapp_message_id text,
  sent_at timestamptz,
  expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists delivery_survey_links_order_id_idx
  on public.delivery_survey_links (order_id);

create index if not exists delivery_survey_links_status_idx
  on public.delivery_survey_links (send_status);

create table if not exists public.delivery_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_link_id uuid not null references public.delivery_survey_links(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  satisfaction_score smallint not null check (satisfaction_score between 1 and 5),
  delivery_met_expectations boolean not null,
  recommendation_score smallint not null check (recommendation_score between 0 and 10),
  product_expectation boolean not null,
  comments text,
  created_at timestamptz not null default now()
);

create unique index if not exists delivery_survey_responses_link_unique
  on public.delivery_survey_responses (survey_link_id);

comment on table public.delivery_survey_links is 'Historial de envíos de encuesta post-entrega vía WhatsApp';
comment on table public.delivery_survey_responses is 'Respuestas a encuestas post-entrega.';
