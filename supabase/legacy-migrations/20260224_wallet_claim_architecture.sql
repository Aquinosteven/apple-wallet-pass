create extension if not exists pgcrypto;

create table if not exists public.registrants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  email text not null,
  phone text null,
  source text null,
  created_at timestamptz not null default now()
);

create table if not exists public.passes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registrant_id uuid not null references public.registrants(id) on delete cascade,
  claim_token text not null unique,
  claimed_at timestamptz null,
  status text not null default 'active',
  apple_serial_number text null unique,
  google_object_id text null unique,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists registrants_event_id_idx on public.registrants (event_id);
create index if not exists registrants_email_idx on public.registrants (email);

create index if not exists passes_event_id_idx on public.passes (event_id);
create index if not exists passes_registrant_id_idx on public.passes (registrant_id);
create index if not exists passes_claim_token_idx on public.passes (claim_token);
