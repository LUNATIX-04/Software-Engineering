alter table profiles
  add column if not exists password_hash text;
