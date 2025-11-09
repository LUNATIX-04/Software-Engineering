alter table public.projects
  add column if not exists last_used_at timestamptz not null default timezone('utc'::text, now());

create index if not exists projects_owner_last_used_idx
  on public.projects (owner_id, last_used_at desc, created_at desc);
