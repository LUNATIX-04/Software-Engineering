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
