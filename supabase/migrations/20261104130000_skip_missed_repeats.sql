-- Completing a repeating task that was days late moved it only one step from its
-- old date, so a daily task five days late came back four days late, then three,
-- and had to be completed once per missed day. Now it jumps to the first
-- occurrence after today (in the person's timezone): missed days are skipped.

-- First occurrence strictly after p_after, keeping the task's own pattern: its
-- chosen weekdays, every day, the weekday of p_due, or the day of the month of
-- p_due (clamped to shorter months, as before).
create or replace function public.next_repeat_date(
  p_due date,
  p_recurrence public.task_recurrence,
  p_days smallint[],
  p_after date
)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_after date := greatest(p_due, p_after);
  v_months integer := 1;
  v_next date;
begin
  if p_days is not null
    and p_recurrence in ('daily'::public.task_recurrence, 'weekly'::public.task_recurrence) then
    select min(v_after + offset_days) into v_next
    from generate_series(1, 7) as offset_days
    where extract(dow from v_after + offset_days)::smallint = any (p_days);
    return coalesce(v_next, v_after + 7);
  end if;

  case p_recurrence
    when 'daily'::public.task_recurrence then
      return v_after + 1;
    when 'weekly'::public.task_recurrence then
      return p_due + 7 * ((v_after - p_due) / 7 + 1);
    when 'monthly'::public.task_recurrence then
      loop
        v_next := (p_due + make_interval(months => v_months))::date;
        exit when v_next > v_after;
        v_months := v_months + 1;
      end loop;
      return v_next;
  end case;
  return null;
end;
$$;

revoke all on function public.next_repeat_date(date, public.task_recurrence, smallint[], date)
  from public, anon;
grant execute on function public.next_repeat_date(date, public.task_recurrence, smallint[], date)
  to authenticated, service_role;

create or replace function public.advance_recurrent_task()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date;
begin
  if new.status = 'completed'::public.task_status
    and old.status is distinct from 'completed'::public.task_status
    and new.recurrence is not null
    and new.due_date is not null then
    select (now() at time zone coalesce(
      (select p.timezone from public.user_preferences p where p.user_id = new.user_id),
      'America/Sao_Paulo'
    ))::date into v_today;

    new.due_date := public.next_repeat_date(
      new.due_date, new.recurrence, new.recurrence_days, v_today
    );
    new.status := 'todo'::public.task_status;
    new.completed_at := null;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
