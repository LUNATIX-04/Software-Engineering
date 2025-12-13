-- Drop legacy usage tracking if it exists
alter table if exists public.projects drop column if exists last_used_at;

drop table if exists public.project_usage;

drop type if exists public."ProjectRole" cascade;
drop type if exists public."ProjectMemberStatus" cascade;

create type public."ProjectRole" as enum ('OWNER', 'HEADER', 'MEMBER');
create type public."ProjectMemberStatus" as enum ('ACTIVE', 'INVITED');

create table if not exists public.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public."ProjectRole" not null default 'MEMBER',
  username text not null,
  department_id uuid references public.project_departments(id) on delete set null,
  status public."ProjectMemberStatus" not null default 'ACTIVE',
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(project_id, user_id)
);

create table if not exists public.project_invites (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique,
  role public."ProjectRole" not null default 'MEMBER',
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists project_members_project_idx on public.project_members(project_id);
create index if not exists project_members_user_idx on public.project_members(user_id);
create index if not exists project_members_department_idx on public.project_members(department_id);
create index if not exists project_invites_project_idx on public.project_invites(project_id);

-- Backfill existing owners as members
insert into public.project_members (project_id, user_id, role, username)
select p.id, p.owner_id, 'OWNER', coalesce(pr.full_name, 'Project Owner')
from public.projects p
left join public.profiles pr on pr.id = p.owner_id
on conflict (project_id, user_id) do nothing;
