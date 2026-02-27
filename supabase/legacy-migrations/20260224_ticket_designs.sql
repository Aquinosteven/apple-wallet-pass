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

create index if not exists ticket_designs_user_id_idx on public.ticket_designs (user_id);
create index if not exists ticket_designs_event_id_idx on public.ticket_designs (event_id);

drop trigger if exists ticket_designs_set_updated_at on public.ticket_designs;
create trigger ticket_designs_set_updated_at
before update on public.ticket_designs
for each row execute function public.set_updated_at();

alter table public.ticket_designs enable row level security;

drop policy if exists ticket_designs_select_own on public.ticket_designs;
create policy ticket_designs_select_own
on public.ticket_designs
for select
to authenticated
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
to authenticated
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
to authenticated
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
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.user_id = auth.uid()
  )
);
