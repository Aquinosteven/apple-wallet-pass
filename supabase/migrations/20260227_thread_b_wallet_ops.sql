create extension if not exists pgcrypto;

alter table public.events
  add column if not exists wallet_reissue_policy text not null default 'revoke_old' check (wallet_reissue_policy in ('revoke_old', 'keep_old')),
  add column if not exists reminders_paused boolean not null default false,
  add column if not exists canceled_at timestamptz null,
  add column if not exists cancellation_policy text not null default 'immediate_revoke_all' check (cancellation_policy in ('immediate_revoke_all'));

alter table public.passes
  add column if not exists replaced_by_pass_id uuid null references public.passes(id) on delete set null,
  add column if not exists replacement_of_pass_id uuid null references public.passes(id) on delete set null,
  add column if not exists replacement_state text null check (replacement_state in ('replacement', 'revoked')),
  add column if not exists revoked_at timestamptz null,
  add column if not exists revoked_reason text null,
  add column if not exists reissue_link_path text null;

create table if not exists public.apple_device_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.events(id) on delete cascade,
  pass_id uuid null references public.passes(id) on delete cascade,
  device_library_id text not null,
  pass_type_identifier text not null,
  serial_number text not null,
  push_token text not null,
  active boolean not null default true,
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_library_id, pass_type_identifier, serial_number)
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

create table if not exists public.reminder_definitions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('fixed_datetime', 'relative_offset')),
  send_at timestamptz null,
  offset_minutes integer null,
  paused boolean not null default false,
  latest_editable_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  reminder_definition_id uuid not null references public.reminder_definitions(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  run_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'retrying', 'sent', 'failed', 'dead_letter')),
  attempt_count integer not null default 0,
  retry_at timestamptz null,
  last_error text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  queue_kind text not null check (queue_kind in ('wallet_update', 'reminder')),
  source_job_id uuid null,
  event_id uuid null references public.events(id) on delete set null,
  pass_id uuid null references public.passes(id) on delete set null,
  error_message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_ops_errors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.events(id) on delete set null,
  pass_id uuid null references public.passes(id) on delete set null,
  scope text not null,
  severity text not null default 'error' check (severity in ('warn', 'error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz null,
  created_at timestamptz not null default now()
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

create index if not exists apple_device_registrations_pass_idx on public.apple_device_registrations (pass_id, active);
create index if not exists wallet_update_jobs_status_idx on public.wallet_update_jobs (status, retry_at);
create index if not exists reminder_definitions_event_idx on public.reminder_definitions (event_id);
create index if not exists reminder_jobs_status_idx on public.reminder_jobs (status, retry_at);
create index if not exists dead_letter_queue_created_idx on public.dead_letter_queue (created_at desc);
create index if not exists wallet_ops_errors_created_idx on public.wallet_ops_errors (created_at desc, resolved_at);
create index if not exists pass_writeback_state_event_idx on public.pass_writeback_state (event_id);

drop trigger if exists apple_device_registrations_set_updated_at on public.apple_device_registrations;
create trigger apple_device_registrations_set_updated_at
before update on public.apple_device_registrations
for each row execute function public.set_updated_at();

drop trigger if exists wallet_update_jobs_set_updated_at on public.wallet_update_jobs;
create trigger wallet_update_jobs_set_updated_at
before update on public.wallet_update_jobs
for each row execute function public.set_updated_at();

drop trigger if exists reminder_definitions_set_updated_at on public.reminder_definitions;
create trigger reminder_definitions_set_updated_at
before update on public.reminder_definitions
for each row execute function public.set_updated_at();

drop trigger if exists reminder_jobs_set_updated_at on public.reminder_jobs;
create trigger reminder_jobs_set_updated_at
before update on public.reminder_jobs
for each row execute function public.set_updated_at();

drop trigger if exists pass_writeback_state_set_updated_at on public.pass_writeback_state;
create trigger pass_writeback_state_set_updated_at
before update on public.pass_writeback_state
for each row execute function public.set_updated_at();
