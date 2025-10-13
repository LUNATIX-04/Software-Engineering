alter table public.profiles
  add column if not exists department_layout text not null default 'fullWidth';

alter table public.profiles
  add column if not exists theme text not null default 'standard';
