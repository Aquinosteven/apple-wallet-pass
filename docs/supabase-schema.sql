-- ShowFi Supabase schema and RLS
-- Run this in Supabase SQL Editor for your project.

create extension if not exists pgcrypto;

-- Keep updated_at current on row updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  starts_at timestamptz null,
  timezone text not null default 'America/Chicago',
  description text null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  background_color text not null default '#0B1220',
  barcode_enabled boolean not null default true,
  logo_url text null,
  strip_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id)
);

create table if not exists public.issued_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  attendee_name text not null,
  attendee_email text not null,
  issued_at timestamptz not null default now(),
  apple_pkpass_url text null,
  google_wallet_url text null,
  status text not null default 'issued'
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists ticket_designs_user_id_idx on public.ticket_designs (user_id);
create index if not exists ticket_designs_event_id_idx on public.ticket_designs (event_id);
create index if not exists issued_tickets_user_id_idx on public.issued_tickets (user_id);
create index if not exists issued_tickets_event_id_idx on public.issued_tickets (event_id);
create index if not exists issued_tickets_event_issued_at_idx on public.issued_tickets (event_id, issued_at desc);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists ticket_designs_set_updated_at on public.ticket_designs;
create trigger ticket_designs_set_updated_at
before update on public.ticket_designs
for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.ticket_designs enable row level security;
alter table public.issued_tickets enable row level security;

drop policy if exists events_select_own on public.events;
create policy events_select_own
on public.events
for select
using (user_id = auth.uid());

drop policy if exists events_insert_own on public.events;
create policy events_insert_own
on public.events
for insert
with check (user_id = auth.uid());

drop policy if exists events_update_own on public.events;
create policy events_update_own
on public.events
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists events_delete_own on public.events;
create policy events_delete_own
on public.events
for delete
using (user_id = auth.uid());

drop policy if exists ticket_designs_select_own on public.ticket_designs;
create policy ticket_designs_select_own
on public.ticket_designs
for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists ticket_designs_insert_own on public.ticket_designs;
create policy ticket_designs_insert_own
on public.ticket_designs
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists ticket_designs_update_own on public.ticket_designs;
create policy ticket_designs_update_own
on public.ticket_designs
for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists ticket_designs_delete_own on public.ticket_designs;
create policy ticket_designs_delete_own
on public.ticket_designs
for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists issued_tickets_select_own on public.issued_tickets;
create policy issued_tickets_select_own
on public.issued_tickets
for select
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists issued_tickets_insert_own on public.issued_tickets;
create policy issued_tickets_insert_own
on public.issued_tickets
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists issued_tickets_update_own on public.issued_tickets;
create policy issued_tickets_update_own
on public.issued_tickets
for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists issued_tickets_delete_own on public.issued_tickets;
create policy issued_tickets_delete_own
on public.issued_tickets
for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);

-- Storage bucket for design assets.
-- Folder convention: /<user_id>/<event_id>/logo.png, strip.png, background.png
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'assets') then
    insert into storage.buckets (id, name, public)
    values ('assets', 'assets', false);
  end if;
end
$$;

drop policy if exists assets_objects_select_own on storage.objects;
create policy assets_objects_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists assets_objects_insert_own on storage.objects;
create policy assets_objects_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists assets_objects_update_own on storage.objects;
create policy assets_objects_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists assets_objects_delete_own on storage.objects;
create policy assets_objects_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
