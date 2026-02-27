create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.integrations_ghl (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id text null,
  default_event_id uuid null references public.events(id) on delete set null,
  api_key_encrypted text not null,
  api_key_last4 text not null,
  verified_at timestamptz null,
  last_webhook_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create unique index if not exists integrations_ghl_location_id_unique_idx
on public.integrations_ghl (location_id)
where location_id is not null;

create index if not exists integrations_ghl_user_id_idx on public.integrations_ghl (user_id);

create table if not exists public.ghl_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  integration_id uuid null references public.integrations_ghl(id) on delete set null,
  source text not null default 'ghl_tag_added',
  is_test boolean not null default false,
  idempotency_key text null,
  request_body jsonb not null default '{}'::jsonb,
  event_id text null,
  tag text null,
  contact_id text null,
  location_id text null,
  pass_id uuid null references public.passes(id) on delete set null,
  claim_token text null,
  claim_url text null,
  apple_wallet_url text null,
  google_wallet_url text null,
  webhook_received boolean not null default false,
  pass_created boolean not null default false,
  claim_link_created boolean not null default false,
  ghl_writeback_ok boolean not null default false,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'failed', 'duplicate')),
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ghl_webhook_logs_idempotency_key_unique_idx
on public.ghl_webhook_logs (idempotency_key)
where idempotency_key is not null;

create index if not exists ghl_webhook_logs_user_created_idx
on public.ghl_webhook_logs (user_id, created_at desc);

create index if not exists ghl_webhook_logs_location_created_idx
on public.ghl_webhook_logs (location_id, created_at desc);

create index if not exists ghl_webhook_logs_status_created_idx
on public.ghl_webhook_logs (processing_status, created_at desc);

drop trigger if exists integrations_ghl_set_updated_at on public.integrations_ghl;
create trigger integrations_ghl_set_updated_at
before update on public.integrations_ghl
for each row execute function public.set_updated_at();

drop trigger if exists ghl_webhook_logs_set_updated_at on public.ghl_webhook_logs;
create trigger ghl_webhook_logs_set_updated_at
before update on public.ghl_webhook_logs
for each row execute function public.set_updated_at();

alter table public.integrations_ghl enable row level security;
alter table public.ghl_webhook_logs enable row level security;

drop policy if exists integrations_ghl_select_own on public.integrations_ghl;
create policy integrations_ghl_select_own
on public.integrations_ghl
for select
using (user_id = auth.uid());

drop policy if exists integrations_ghl_insert_own on public.integrations_ghl;
create policy integrations_ghl_insert_own
on public.integrations_ghl
for insert
with check (user_id = auth.uid());

drop policy if exists integrations_ghl_update_own on public.integrations_ghl;
create policy integrations_ghl_update_own
on public.integrations_ghl
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ghl_webhook_logs_select_own on public.ghl_webhook_logs;
create policy ghl_webhook_logs_select_own
on public.ghl_webhook_logs
for select
using (user_id = auth.uid());
