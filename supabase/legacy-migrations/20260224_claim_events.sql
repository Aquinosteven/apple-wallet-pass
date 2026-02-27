create extension if not exists pgcrypto;

create table if not exists public.claim_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null check (
    event_type in (
      'claim_viewed',
      'claim_started',
      'pkpass_downloaded',
      'apple_wallet_added',
      'google_wallet_link_created',
      'google_wallet_saved',
      'claim_error'
    )
  ),
  claim_id text null,
  pass_id uuid null references public.passes(id) on delete set null,
  event_id uuid null references public.events(id) on delete set null,
  user_id uuid null references auth.users(id) on delete set null,
  ip_hash text not null,
  ua text null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists claim_events_created_at_idx on public.claim_events (created_at desc);
create index if not exists claim_events_event_type_idx on public.claim_events (event_type);
create index if not exists claim_events_claim_id_idx on public.claim_events (claim_id);

alter table public.claim_events enable row level security;

drop policy if exists claim_events_service_role_insert on public.claim_events;
create policy claim_events_service_role_insert
on public.claim_events
for insert
to service_role
with check (true);

drop policy if exists claim_events_select_own on public.claim_events;
create policy claim_events_select_own
on public.claim_events
for select
to authenticated
using (user_id = auth.uid());
