alter table if exists public.projects
  drop column if exists last_used_at;

create table if not exists public.project_usage (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  last_used_at timestamptz not null default timezone('utc'::text, now()),
  primary key (project_id, user_id)
);

create index if not exists project_usage_user_last_used_idx
  on public.project_usage (user_id, last_used_at desc);
