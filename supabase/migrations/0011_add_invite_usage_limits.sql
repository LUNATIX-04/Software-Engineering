alter table if exists public.project_invites
  add column if not exists max_uses integer;

alter table if exists public.project_invites
  add column if not exists use_count integer not null default 0;
