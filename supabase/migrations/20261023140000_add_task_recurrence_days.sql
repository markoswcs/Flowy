-- Weekdays a daily or weekly task repeats on (0 = Sunday ... 6 = Saturday, like
-- extract(dow)). NULL keeps the plain behaviour: every day, or every week on the
-- weekday of the due date.
alter table public.tasks
  add column if not exists recurrence_days smallint[];

alter table public.tasks
  drop constraint if exists tasks_recurrence_days_valid,
  add constraint tasks_recurrence_days_valid
    check (
      recurrence_days is null
      or (
        recurrence in ('daily'::public.task_recurrence, 'weekly'::public.task_recurrence)
        and cardinality(recurrence_days) between 1 and 7
        and recurrence_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
      )
    );

-- Completing a recurring task moves it to its next occurrence. With weekdays
-- chosen, that is the next chosen weekday after the current due date.
create or replace function public.advance_recurrent_task()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_offset integer;
begin
  if new.status = 'completed'::public.task_status
    and old.status is distinct from 'completed'::public.task_status
    and new.recurrence is not null
    and new.due_date is not null then
    if new.recurrence_days is not null
      and new.recurrence in ('daily'::public.task_recurrence, 'weekly'::public.task_recurrence) then
      select min(offset_days) into v_offset
      from generate_series(1, 7) as offset_days
      where extract(dow from new.due_date + offset_days)::smallint = any (new.recurrence_days);
      new.due_date := new.due_date + coalesce(v_offset, 7);
    else
      new.due_date := case new.recurrence
        when 'daily'::public.task_recurrence then new.due_date + 1
        when 'weekly'::public.task_recurrence then new.due_date + 7
        when 'monthly'::public.task_recurrence
          then (new.due_date + interval '1 month')::date
      end;
    end if;
    new.status := 'todo'::public.task_status;
    new.completed_at := null;
  end if;

  return new;
end;
$$;

comment on column public.tasks.recurrence_days is
  'Weekdays (0 = Sunday) a daily/weekly task repeats on; NULL = every day / same weekday.';

notify pgrst, 'reload schema';
