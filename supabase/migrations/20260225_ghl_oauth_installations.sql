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

create table if not exists public.ghl_installations (
  id uuid primary key default gen_random_uuid(),
  location_id text not null unique,
  company_id text null,
  agency_id text null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  installed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ghl_installations_location_id_idx on public.ghl_installations (location_id);
create index if not exists ghl_installations_token_expires_at_idx on public.ghl_installations (token_expires_at);

drop trigger if exists ghl_installations_set_updated_at on public.ghl_installations;
create trigger ghl_installations_set_updated_at
before update on public.ghl_installations
for each row execute function public.set_updated_at();

create table if not exists public.ghl_oauth_states (
  state text primary key,
  return_to text null,
  created_at timestamptz not null default now()
);

create index if not exists ghl_oauth_states_created_at_idx on public.ghl_oauth_states (created_at);
