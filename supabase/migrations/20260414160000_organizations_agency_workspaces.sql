create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null default 'solo' check (type in ('solo', 'agency')),
  billing_state text not null default 'trial' check (billing_state in ('trial', 'active', 'past_due', 'canceled')),
  plan_code text not null default 'solo_monthly_v1',
  soft_workspace_limit integer not null default 25 check (soft_workspace_limit > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.workspace_integrations_ghl (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  legacy_integration_id uuid null references public.integrations_ghl(id) on delete set null,
  location_id text null,
  default_event_id uuid null references public.events(id) on delete set null,
  api_key_encrypted text not null,
  api_key_last4 text not null,
  verified_at timestamptz null,
  last_webhook_at timestamptz null,
  last_error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id)
);

create unique index if not exists workspace_integrations_ghl_location_id_unique_idx
  on public.workspace_integrations_ghl (location_id)
  where location_id is not null;

alter table public.accounts
  add column if not exists organization_id uuid null references public.organizations(id) on delete set null;

alter table public.accounts
  add column if not exists is_primary_workspace boolean not null default false;

alter table public.accounts
  add column if not exists workspace_kind text not null default 'client' check (workspace_kind in ('primary', 'client'));

alter table public.accounts
  add column if not exists workspace_status text not null default 'active' check (workspace_status in ('active', 'archived'));

do $$
begin
  if to_regclass('public.ghl_webhook_logs') is not null then
    execute 'alter table public.ghl_webhook_logs add column if not exists account_id uuid null references public.accounts(id) on delete set null';
  end if;
end $$;

create index if not exists accounts_organization_id_idx
  on public.accounts (organization_id, created_at asc);

create index if not exists accounts_owner_user_id_idx
  on public.accounts (owner_user_id, created_at asc);

do $$
begin
  if to_regclass('public.ghl_webhook_logs') is not null then
    execute 'create index if not exists ghl_webhook_logs_account_created_idx on public.ghl_webhook_logs (account_id, created_at desc)';
  end if;
end $$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

drop trigger if exists workspace_integrations_ghl_set_updated_at on public.workspace_integrations_ghl;
create trigger workspace_integrations_ghl_set_updated_at
before update on public.workspace_integrations_ghl
for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspace_integrations_ghl enable row level security;

drop policy if exists organization_members_select_own on public.organization_members;
create policy organization_members_select_own
on public.organization_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
on public.organizations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members members
    where members.organization_id = organizations.id
      and members.user_id = auth.uid()
  )
);

drop policy if exists workspace_integrations_ghl_select_member on public.workspace_integrations_ghl;
create policy workspace_integrations_ghl_select_member
on public.workspace_integrations_ghl
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts accounts
    join public.organization_members members on members.organization_id = accounts.organization_id
    where accounts.id = workspace_integrations_ghl.account_id
      and members.user_id = auth.uid()
  )
);

do $$
declare
  account_row record;
  normalized_email text;
  next_org_id uuid;
  next_plan_code text;
  next_org_type text;
  next_org_name text;
begin
  for account_row in
    select
      accounts.id,
      accounts.owner_user_id,
      accounts.slug,
      accounts.name,
      accounts.billing_state,
      coalesce(users.email, '') as owner_email,
      account_subscriptions.plan_code
    from public.accounts
    left join auth.users users on users.id = accounts.owner_user_id
    left join public.account_subscriptions on account_subscriptions.account_id = accounts.id
    where accounts.organization_id is null
    order by accounts.created_at asc
  loop
    normalized_email := lower(trim(account_row.owner_email));
    next_org_type := case
      when normalized_email = 'access@badmarketing.com' then 'agency'
      else 'solo'
    end;
    next_plan_code := case
      when normalized_email = 'access@badmarketing.com' then 'internal_agency_free_v1'
      when account_row.plan_code = 'core_yearly_v1' then 'solo_yearly_v1'
      when account_row.plan_code = 'free_access_v1' then 'internal_agency_free_v1'
      else 'solo_monthly_v1'
    end;
    next_org_name := case
      when normalized_email = 'access@badmarketing.com' then 'Bad Marketing'
      else coalesce(nullif(account_row.name, ''), nullif(account_row.owner_email, ''), 'ShowFi Organization')
    end;

    insert into public.organizations (
      name,
      slug,
      type,
      billing_state,
      plan_code,
      metadata
    )
    values (
      next_org_name,
      concat(account_row.slug, '-org'),
      next_org_type,
      case
        when normalized_email = 'access@badmarketing.com' then 'active'
        else account_row.billing_state
      end,
      next_plan_code,
      case
        when normalized_email = 'access@badmarketing.com' then jsonb_build_object('internal_account', true, 'internal_access', 'permanent_free')
        else '{}'::jsonb
      end
    )
    on conflict (slug) do update
      set
        name = excluded.name,
        type = excluded.type,
        billing_state = excluded.billing_state,
        plan_code = excluded.plan_code,
        metadata = organizations.metadata || excluded.metadata
    returning id into next_org_id;

    update public.accounts
    set
      organization_id = next_org_id,
      is_primary_workspace = true,
      workspace_kind = 'primary',
      workspace_status = 'active'
    where id = account_row.id;

    insert into public.organization_members (organization_id, user_id, role)
    values (next_org_id, account_row.owner_user_id, 'owner')
    on conflict (organization_id, user_id) do update
      set role = excluded.role;
  end loop;
end $$;

insert into public.workspace_integrations_ghl (
  account_id,
  legacy_integration_id,
  location_id,
  default_event_id,
  api_key_encrypted,
  api_key_last4,
  verified_at,
  last_webhook_at,
  last_error,
  metadata
)
select
  accounts.id as account_id,
  integrations_ghl.id as legacy_integration_id,
  integrations_ghl.location_id,
  integrations_ghl.default_event_id,
  integrations_ghl.api_key_encrypted,
  integrations_ghl.api_key_last4,
  integrations_ghl.verified_at,
  integrations_ghl.last_webhook_at,
  integrations_ghl.last_error,
  jsonb_build_object('migrated_from_user_id', integrations_ghl.user_id)
from public.integrations_ghl
join public.accounts on accounts.owner_user_id = integrations_ghl.user_id
where not exists (
  select 1
  from public.workspace_integrations_ghl existing
  where existing.account_id = accounts.id
);

do $$
begin
  if to_regclass('public.ghl_webhook_logs') is not null then
    update public.ghl_webhook_logs logs
    set account_id = accounts.id
    from public.integrations_ghl integrations_ghl
    join public.accounts on accounts.owner_user_id = integrations_ghl.user_id
    where logs.account_id is null
      and logs.integration_id = integrations_ghl.id;
  end if;
end $$;

update public.events
set account_id = accounts.id
from public.accounts
where public.events.account_id is null
  and accounts.owner_user_id = public.events.user_id;

update public.account_subscriptions
set plan_code = case
  when plan_code = 'core_monthly_v1' then 'solo_monthly_v1'
  when plan_code = 'core_yearly_v1' then 'solo_yearly_v1'
  when plan_code = 'free_access_v1' then 'internal_agency_free_v1'
  else plan_code
end
where plan_code in ('core_monthly_v1', 'core_yearly_v1', 'free_access_v1');

update public.organizations
set
  type = 'agency',
  billing_state = 'active',
  plan_code = 'internal_agency_free_v1',
  metadata = organizations.metadata || jsonb_build_object('internal_account', true, 'internal_access', 'permanent_free')
where id in (
  select accounts.organization_id
  from public.accounts
  join auth.users users on users.id = accounts.owner_user_id
  where lower(trim(users.email)) = 'access@badmarketing.com'
);

alter table public.accounts
  drop constraint if exists accounts_owner_user_id_key;
