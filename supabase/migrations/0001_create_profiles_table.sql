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
