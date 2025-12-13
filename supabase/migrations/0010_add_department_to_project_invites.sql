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
