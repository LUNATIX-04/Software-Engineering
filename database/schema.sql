create schema if not exists public;

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  last_sign_in timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint profiles_pkey primary key (id)
);

alter table public.profiles enable row level security;

create or replace function public.trigger_set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_timestamp on public.profiles;

create trigger set_timestamp
before update on public.profiles
for each row
execute function public.trigger_set_timestamp();

create policy "Users can view their own profile" on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can insert their own profile" on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, last_sign_in)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    new.last_sign_in_at
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    last_sign_in = excluded.last_sign_in;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
alter table public.profiles
  add column if not exists department_layout text not null default 'fullWidth';

alter table public.profiles
  add column if not exists theme text not null default 'standard';
create extension if not exists "uuid-ossp";

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  departments text[] not null default array[]::text[],
  image_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.projects enable row level security;

create or replace function public.projects_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trigger_projects_set_updated_at on public.projects;

create trigger trigger_projects_set_updated_at
before update on public.projects
for each row execute function public.projects_set_updated_at();

create policy "Users can view own projects" on public.projects
  for select
  using (auth.uid() = owner_id);

create policy "Users can insert own projects" on public.projects
  for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own projects" on public.projects
  for update
  using (auth.uid() = owner_id);

create policy "Users can delete own projects" on public.projects
  for delete
  using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do update set public = true;

create policy "Public access to project images" on storage.objects
  for select
  using (bucket_id = 'project-images');

create policy "Authenticated upload project images" on storage.objects
  for insert
  with check (bucket_id = 'project-images' and auth.role() = 'authenticated');

create policy "Authenticated update own project images" on storage.objects
  for update
  using (bucket_id = 'project-images' and auth.uid() = owner);

create policy "Authenticated delete own project images" on storage.objects
  for delete
  using (bucket_id = 'project-images' and auth.uid() = owner);
alter table profiles
  add column if not exists password_hash text;
alter table public.profiles
  add column if not exists auth_method text not null default 'social';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, last_sign_in, auth_method)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    new.last_sign_in_at,
    coalesce(new.raw_user_meta_data->>'auth_method', 'social')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    last_sign_in = excluded.last_sign_in,
    auth_method = coalesce(excluded.auth_method, public.profiles.auth_method);

  return new;
end;
$$;
alter table public.profiles
  drop column if exists auth_method;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, last_sign_in)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    new.last_sign_in_at
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    last_sign_in = excluded.last_sign_in;

  return new;
end;
$$;
alter table public.profiles
  add column if not exists bio text;
alter table public.projects
  add column if not exists last_used_at timestamptz not null default timezone('utc'::text, now());

create index if not exists projects_owner_last_used_idx
  on public.projects (owner_id, last_used_at desc, created_at desc);
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
alter table if exists public.project_invites
  add column if not exists department_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_invites_department_id_fkey'
  ) then
    alter table public.project_invites
      add constraint project_invites_department_id_fkey
      foreign key (department_id)
      references public.project_departments(id)
      on delete set null;
  end if;
end $$;
alter table if exists public.project_invites
  add column if not exists max_uses integer;

alter table if exists public.project_invites
  add column if not exists use_count integer not null default 0;
create type if not exists public.project_task_status as enum ('SUBMITTED','IN_PROGRESS','BLOCKED');

create table if not exists public.project_tasks (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid not null references public.projects(id) on delete cascade,
    department_id uuid references public.project_departments(id) on delete set null,
    created_by_member_id uuid not null references public.project_members(id) on delete cascade,
    title text not null,
    detail text,
    status public.project_task_status not null default 'SUBMITTED',
    due_date timestamptz,
    created_at timestamptz not null default timezone('utc'::text, now()),
    updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.project_task_assignees (
    task_id uuid not null references public.project_tasks(id) on delete cascade,
    member_id uuid not null references public.project_members(id) on delete cascade,
    assigned_at timestamptz not null default timezone('utc'::text, now()),
    primary key (task_id, member_id)
);

create index if not exists project_tasks_project_id_idx on public.project_tasks(project_id);
create index if not exists project_tasks_department_id_idx on public.project_tasks(department_id);
create index if not exists project_task_assignees_member_id_idx on public.project_task_assignees(member_id);
