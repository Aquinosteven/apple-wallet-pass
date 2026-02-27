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

create table if not exists public.support_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'support_internal')),
  created_at timestamptz not null default now()
);

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value)
values ('promo.counter', '{"claimed":17,"cap":100}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.reminder_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid null references public.events(id) on delete set null,
  pass_id uuid null references public.passes(id) on delete set null,
  channel text not null default 'email',
  status text not null default 'sent' check (status in ('queued', 'sent', 'failed')),
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

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'audit_log'
  ) then
    insert into public.audit_logs (id, actor_user_id, owner_user_id, action, target_type, target_id, metadata, created_at)
    select
      id,
      actor_user_id,
      null,
      action,
      resource_type,
      resource_id,
      metadata,
      created_at
    from public.audit_log
    on conflict (id) do nothing;

    alter table public.audit_log rename to audit_log_legacy;
  end if;
end
$$;

drop view if exists public.audit_log;
create view public.audit_log as
select *
from public.audit_logs;

create table if not exists public.admin_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed')),
  error_message text null,
  attempt_count integer not null default 0,
  replayed_from_id uuid null references public.admin_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_exports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  format text not null check (format in ('csv', 'xlsx')),
  scope text not null check (scope in ('filtered', 'full')),
  filters jsonb not null default '{}'::jsonb,
  dataset jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  status text not null default 'ready' check (status in ('ready', 'failed', 'expired')),
  error_message text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists reminder_sends_user_created_idx
on public.reminder_sends (user_id, created_at desc);

create index if not exists support_tickets_owner_created_idx
on public.support_tickets (owner_user_id, created_at desc);

create index if not exists audit_logs_owner_created_idx
on public.audit_logs (owner_user_id, created_at desc);

create index if not exists audit_logs_action_created_idx
on public.audit_logs (action, created_at desc);

create index if not exists admin_jobs_owner_status_created_idx
on public.admin_jobs (owner_user_id, status, created_at desc);

create index if not exists data_exports_owner_created_idx
on public.data_exports (owner_user_id, created_at desc);

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

drop trigger if exists admin_jobs_set_updated_at on public.admin_jobs;
create trigger admin_jobs_set_updated_at
before update on public.admin_jobs
for each row execute function public.set_updated_at();

drop trigger if exists app_config_set_updated_at on public.app_config;
create trigger app_config_set_updated_at
before update on public.app_config
for each row execute function public.set_updated_at();

create or replace function public.purge_old_audit_logs()
returns trigger
language plpgsql
as $$
begin
  delete from public.audit_logs
  where created_at < (now() - interval '1 year');
  return null;
end;
$$;

drop trigger if exists audit_logs_purge_old on public.audit_logs;
create trigger audit_logs_purge_old
after insert on public.audit_logs
for each statement execute function public.purge_old_audit_logs();

alter table public.support_roles enable row level security;
alter table public.app_config enable row level security;
alter table public.reminder_sends enable row level security;
alter table public.support_tickets enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admin_jobs enable row level security;
alter table public.data_exports enable row level security;

drop policy if exists support_roles_select_self on public.support_roles;
create policy support_roles_select_self
on public.support_roles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists reminder_sends_select_own on public.reminder_sends;
create policy reminder_sends_select_own
on public.reminder_sends
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists support_tickets_select_own on public.support_tickets;
create policy support_tickets_select_own
on public.support_tickets
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists support_tickets_insert_own on public.support_tickets;
create policy support_tickets_insert_own
on public.support_tickets
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists audit_logs_select_own on public.audit_logs;
create policy audit_logs_select_own
on public.audit_logs
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists admin_jobs_select_own on public.admin_jobs;
create policy admin_jobs_select_own
on public.admin_jobs
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists data_exports_select_own on public.data_exports;
create policy data_exports_select_own
on public.data_exports
for select
to authenticated
using (owner_user_id = auth.uid());
