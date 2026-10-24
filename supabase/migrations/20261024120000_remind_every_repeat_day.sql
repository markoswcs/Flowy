-- A repeating task only moves to its next date when it is completed. Until now
-- the reminder fired only on that stored date, so a day left open silenced
-- every later day. Now a repeating task that is still open also reminds on
-- each later day it repeats on (its chosen weekdays, every day, the same
-- weekday or the same day of the month), at its time. `overdue` tells the app
-- the task sits under "Atrasadas" rather than "Hoje".
drop function if exists public.claim_due_task_reminders(interval);

create function public.claim_due_task_reminders(
  p_grace interval default interval '15 minutes'
)
returns table (task_id uuid, user_id uuid, title text, due_time time, overdue boolean)
language sql
set search_path = ''
as $$
  with candidates as (
    select
      t.id,
      t.due_date,
      t.due_time,
      t.recurrence,
      t.recurrence_days,
      coalesce(p.timezone, 'America/Sao_Paulo') as tz
    from public.tasks t
    left join public.user_preferences p on p.user_id = t.user_id
    where t.due_time is not null
      and t.due_date is not null
      and t.deleted_at is null
      and t.status <> 'completed'::public.task_status
      and (
        t.due_date between current_date - 1 and current_date + 1
        or (t.recurrence is not null and t.due_date < current_date + 1)
      )
      and exists (
        select 1 from public.push_subscriptions s where s.user_id = t.user_id
      )
  ),
  occurrences as (
    select c.id, (c.due_date + c.due_time) at time zone c.tz as due_at, false as overdue
    from candidates c
    union all
    -- Yesterday too, for a time just before midnight still inside the grace.
    select c.id, (d.day + c.due_time) at time zone c.tz, true
    from candidates c
    cross join lateral (
      values
        ((now() at time zone c.tz)::date - 1),
        ((now() at time zone c.tz)::date)
    ) as d(day)
    where c.recurrence is not null
      and d.day > c.due_date
      and case
        when c.recurrence_days is not null
          then extract(dow from d.day)::smallint = any (c.recurrence_days)
        when c.recurrence = 'daily'::public.task_recurrence then true
        when c.recurrence = 'weekly'::public.task_recurrence
          then extract(dow from d.day) = extract(dow from c.due_date)
        else extract(day from d.day) = extract(day from c.due_date)
      end
  ),
  due as (
    -- The latest moment inside the grace window, one per task.
    select distinct on (o.id) o.id, o.due_at, o.overdue
    from occurrences o
    where o.due_at <= now()
      and o.due_at > now() - p_grace
    order by o.id, o.due_at desc
  )
  update public.tasks t
  set reminder_sent_for = due.due_at
  from due
  where t.id = due.id
    and t.reminder_sent_for is distinct from due.due_at
  returning t.id, t.user_id, t.title, t.due_time, due.overdue;
$$;

revoke all on function public.claim_due_task_reminders(interval)
  from public, anon, authenticated;
grant execute on function public.claim_due_task_reminders(interval) to service_role;

notify pgrst, 'reload schema';
