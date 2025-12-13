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
