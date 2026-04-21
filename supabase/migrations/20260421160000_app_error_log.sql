create table if not exists public.app_error_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text,
  message text not null,
  error_name text,
  stack text,
  context jsonb,
  environment text,
  release text
);

create index if not exists app_error_log_created_at_desc
  on public.app_error_log (created_at desc);

alter table public.app_error_log enable row level security;
