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
