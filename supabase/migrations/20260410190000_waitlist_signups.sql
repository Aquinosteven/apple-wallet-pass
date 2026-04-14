create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  company text,
  use_case text,
  notes text,
  source text not null default 'website_waitlist',
  status text not null default 'pending' check (status in ('pending', 'contacted', 'closed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waitlist_signups_created_idx
  on public.waitlist_signups (created_at desc);

drop trigger if exists waitlist_signups_set_updated_at on public.waitlist_signups;
create trigger waitlist_signups_set_updated_at
before update on public.waitlist_signups
for each row execute function public.set_updated_at();

alter table public.waitlist_signups enable row level security;
