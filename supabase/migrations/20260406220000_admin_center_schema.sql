create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('account', 'user', 'ticket')),
  target_id uuid not null,
  body text not null,
  author_user_id uuid null references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  color text null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_note_tags (
  note_id uuid not null references public.admin_notes(id) on delete cascade,
  tag_id uuid not null references public.admin_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);

create table if not exists public.impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid null references auth.users(id) on delete set null,
  target_account_id uuid null references public.accounts(id) on delete set null,
  reason text not null,
  mode text not null default 'full_access',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz null
);

create index if not exists admin_notes_scope_target_created_idx
  on public.admin_notes (scope, target_id, created_at desc);

create index if not exists impersonation_sessions_target_created_idx
  on public.impersonation_sessions (target_user_id, target_account_id, issued_at desc);

drop trigger if exists admin_notes_set_updated_at on public.admin_notes;
create trigger admin_notes_set_updated_at
before update on public.admin_notes
for each row execute function public.set_updated_at();

alter table public.admin_notes enable row level security;
alter table public.admin_tags enable row level security;
alter table public.admin_note_tags enable row level security;
alter table public.impersonation_sessions enable row level security;
