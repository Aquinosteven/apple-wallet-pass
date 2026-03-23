create table if not exists public.account_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  provider text not null check (provider in ('square', 'stub')),
  provider_customer_id text null,
  provider_subscription_id text null,
  plan_code text not null default 'core_v1',
  status text not null default 'inactive' check (status in ('inactive', 'active', 'past_due', 'canceled')),
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  overage_unit_price_cents integer not null default 0 check (overage_unit_price_cents >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id),
  unique nulls not distinct (provider, provider_subscription_id)
);

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

create index if not exists integrations_ghl_user_id_idx
  on public.integrations_ghl (user_id);

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

create index if not exists wallet_ops_errors_created_idx
  on public.wallet_ops_errors (created_at desc, resolved_at);

drop trigger if exists account_subscriptions_set_updated_at on public.account_subscriptions;
create trigger account_subscriptions_set_updated_at
before update on public.account_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists integrations_ghl_set_updated_at on public.integrations_ghl;
create trigger integrations_ghl_set_updated_at
before update on public.integrations_ghl
for each row execute function public.set_updated_at();

alter table public.integrations_ghl enable row level security;

drop policy if exists integrations_ghl_select_own on public.integrations_ghl;
create policy integrations_ghl_select_own
on public.integrations_ghl
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists integrations_ghl_insert_own on public.integrations_ghl;
create policy integrations_ghl_insert_own
on public.integrations_ghl
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists integrations_ghl_update_own on public.integrations_ghl;
create policy integrations_ghl_update_own
on public.integrations_ghl
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
