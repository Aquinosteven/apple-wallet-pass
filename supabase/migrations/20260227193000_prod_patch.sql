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

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  billing_state text not null default 'trial' check (billing_state in ('trial', 'active', 'past_due', 'canceled')),
  enforcement_enabled boolean not null default true,
  hard_block_issuance boolean not null default false,
  monthly_included_issuances integer not null default 20000 check (monthly_included_issuances >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id)
);

alter table public.events
  add column if not exists account_id uuid null references public.accounts(id) on delete set null;

create index if not exists events_account_id_idx on public.events (account_id);

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  event_id uuid null references public.events(id) on delete cascade,
  source_type text not null default 'generic' check (source_type in ('ghl', 'clickfunnels', 'generic', 'zapier')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  path_token text not null unique,
  active_secret text not null,
  previous_secret text null,
  previous_secret_expires_at timestamptz null,
  signature_header text not null default 'x-showfi-signature',
  mapping_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_mappings (
  id uuid primary key default gen_random_uuid(),
  webhook_endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  version integer not null default 1,
  preset text not null default 'generic' check (preset in ('ghl', 'clickfunnels', 'generic', 'zapier')),
  field_paths jsonb not null default '{}'::jsonb,
  required_fields jsonb not null default '["name","email","phone","joinLink","tier"]'::jsonb,
  created_at timestamptz not null default now(),
  unique (webhook_endpoint_id, version)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  event_id uuid null references public.events(id) on delete set null,
  webhook_endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  delivery_scope text not null check (delivery_scope in ('account', 'event')),
  source_type text not null check (source_type in ('ghl', 'clickfunnels', 'generic', 'zapier')),
  event_type text null,
  request_id text null,
  request_signature text null,
  dedupe_key text not null,
  raw_payload jsonb not null,
  normalized_payload jsonb null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processing', 'processed', 'retrying', 'failed')),
  failure_reason text null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedupe_key)
);

create table if not exists public.issuance_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  webhook_event_id uuid null references public.webhook_events(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'retrying', 'failed')),
  crm_contact_id text null,
  email text not null,
  name text not null,
  phone text null,
  join_link text not null,
  tier text not null default 'GA' check (tier in ('GA', 'VIP')),
  dedupe_key text not null,
  pass_id uuid null references public.passes(id) on delete set null,
  claim_token text null,
  retries integer not null default 0 check (retries >= 0),
  max_retries integer not null default 3 check (max_retries >= 0),
  next_retry_at timestamptz null,
  failure_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedupe_key)
);

create table if not exists public.embed_sessions (
  id uuid primary key default gen_random_uuid(),
  issuance_request_id uuid not null references public.issuance_requests(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed', 'expired')),
  status_page_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_update_jobs (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid null references public.passes(id) on delete cascade,
  event_id uuid null references public.events(id) on delete cascade,
  platform text not null check (platform in ('apple', 'google')),
  status text not null default 'pending' check (status in ('pending', 'retrying', 'succeeded', 'failed', 'dead_letter')),
  attempt_count integer not null default 0,
  retry_at timestamptz null,
  last_error text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pass_writeback_state (
  pass_id uuid primary key references public.passes(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  contact_id text null,
  location_id text null,
  pass_issued_at timestamptz null,
  wallet_added_at timestamptz null,
  join_click_first_at timestamptz null,
  join_click_latest_at timestamptz null,
  join_click_count integer not null default 0,
  last_writeback_at timestamptz null,
  last_error text null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references auth.users(id) on delete set null,
  owner_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.support_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'support_internal')),
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop view if exists public.audit_log;
create view public.audit_log as
select * from public.audit_logs;

create index if not exists webhook_endpoints_scope_idx
  on public.webhook_endpoints (account_id, event_id, status);
create index if not exists webhook_events_account_received_idx
  on public.webhook_events (account_id, received_at desc);
create index if not exists webhook_events_status_idx
  on public.webhook_events (processing_status, received_at desc);
create index if not exists issuance_requests_status_created_idx
  on public.issuance_requests (status, created_at desc);
create index if not exists issuance_requests_contact_idx
  on public.issuance_requests (event_id, crm_contact_id, email);
create index if not exists embed_sessions_account_created_idx
  on public.embed_sessions (account_id, created_at desc);
create index if not exists wallet_update_jobs_status_idx
  on public.wallet_update_jobs (status, retry_at);
create index if not exists pass_writeback_state_event_idx
  on public.pass_writeback_state (event_id);
create index if not exists audit_logs_owner_created_idx
  on public.audit_logs (owner_user_id, created_at desc);
create index if not exists audit_logs_action_created_idx
  on public.audit_logs (action, created_at desc);
create index if not exists support_tickets_owner_created_idx
  on public.support_tickets (owner_user_id, created_at desc);

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists webhook_endpoints_set_updated_at on public.webhook_endpoints;
create trigger webhook_endpoints_set_updated_at
before update on public.webhook_endpoints
for each row execute function public.set_updated_at();

drop trigger if exists webhook_events_set_updated_at on public.webhook_events;
create trigger webhook_events_set_updated_at
before update on public.webhook_events
for each row execute function public.set_updated_at();

drop trigger if exists issuance_requests_set_updated_at on public.issuance_requests;
create trigger issuance_requests_set_updated_at
before update on public.issuance_requests
for each row execute function public.set_updated_at();

drop trigger if exists embed_sessions_set_updated_at on public.embed_sessions;
create trigger embed_sessions_set_updated_at
before update on public.embed_sessions
for each row execute function public.set_updated_at();

drop trigger if exists wallet_update_jobs_set_updated_at on public.wallet_update_jobs;
create trigger wallet_update_jobs_set_updated_at
before update on public.wallet_update_jobs
for each row execute function public.set_updated_at();

drop trigger if exists pass_writeback_state_set_updated_at on public.pass_writeback_state;
create trigger pass_writeback_state_set_updated_at
before update on public.pass_writeback_state
for each row execute function public.set_updated_at();

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();
