create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value)
values
  ('promo.counter', '{"claimed":17,"cap":100}'::jsonb),
  (
    'plan.limits',
    '{
      "plan":"v1",
      "limits":{
        "monthly_passes":10000,
        "support_seats":2
      }
    }'::jsonb
  )
on conflict (key) do nothing;

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

create index if not exists admin_jobs_owner_status_created_idx
  on public.admin_jobs (owner_user_id, status, created_at desc);

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

create index if not exists data_exports_owner_created_idx
  on public.data_exports (owner_user_id, created_at desc);

drop trigger if exists admin_jobs_set_updated_at on public.admin_jobs;
create trigger admin_jobs_set_updated_at
before update on public.admin_jobs
for each row execute function public.set_updated_at();

drop trigger if exists app_config_set_updated_at on public.app_config;
create trigger app_config_set_updated_at
before update on public.app_config
for each row execute function public.set_updated_at();

alter table public.app_config enable row level security;
alter table public.admin_jobs enable row level security;
alter table public.data_exports enable row level security;

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
