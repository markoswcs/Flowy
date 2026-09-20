do $$
begin
  if not exists (
    select 1
      from pg_type
     where typname = 'task_recurrence'
       and typnamespace = 'public'::regnamespace
  ) then
    create type public.task_recurrence as enum ('daily', 'weekly', 'monthly');
  end if;
end;
$$;

alter table public.tasks
  add column if not exists recurrence public.task_recurrence;

alter table public.tasks
  drop constraint if exists tasks_recurrence_requires_due_date,
  add constraint tasks_recurrence_requires_due_date
    check (recurrence is null or due_date is not null);

create or replace function public.advance_recurrent_task()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed'::public.task_status
    and old.status is distinct from 'completed'::public.task_status
    and new.recurrence is not null
    and new.due_date is not null then
    new.due_date := case new.recurrence
      when 'daily'::public.task_recurrence then new.due_date + 1
      when 'weekly'::public.task_recurrence then new.due_date + 7
      when 'monthly'::public.task_recurrence
        then (new.due_date + interval '1 month')::date
    end;
    new.status := 'todo'::public.task_status;
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_advance_recurrence on public.tasks;
create trigger tasks_advance_recurrence
before update of status on public.tasks
for each row execute function public.advance_recurrent_task();

comment on column public.tasks.recurrence is
  'Optional schedule. Completing a recurring task moves it to its next occurrence.';

notify pgrst, 'reload schema';
