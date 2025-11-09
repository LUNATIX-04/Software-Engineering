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
