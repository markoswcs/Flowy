-- A task that is not repeating and was left open past its time now reminds
-- again every 24 hours ("atrasada há N dias"), at the same time of day, for up
-- to 30 days. Repeating tasks keep reminding on each day they repeat on
-- (20261024120000), so they get no extra late reminder. `late_days` tells the
-- app how late the reminder is (0 for the reminder on the due moment itself).
drop function if exists public.claim_due_task_reminders(interval);

create function public.claim_due_task_reminders(
  p_grace interval default interval '15 minutes'
)
returns table (
  task_id uuid,
  user_id uuid,
  title text,
  due_time time,
  overdue boolean,
  late_days integer
)
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
        t.due_date between current_date - 31 and current_date + 1
        or (t.recurrence is not null and t.due_date < current_date + 1)
      )
      and exists (
        select 1 from public.push_subscriptions s where s.user_id = t.user_id
      )
  ),
  occurrences as (
    select c.id, (c.due_date + c.due_time) at time zone c.tz as due_at, false as overdue, 0 as late_days
    from candidates c
    union all
    -- Repeating and still open: each later day it repeats on (yesterday too,
    -- for a time just before midnight still inside the grace window).
    select c.id, (d.day + c.due_time) at time zone c.tz, true, 0
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
    union all
    -- Not repeating and still open: every 24 hours after its moment.
    select c.id, (c.due_date + c.due_time) at time zone c.tz + make_interval(days => n), true, n
    from candidates c
    cross join generate_series(1, 30) as n
    where c.recurrence is null
  ),
  due as (
    -- The latest moment inside the grace window, one per task.
    select distinct on (o.id) o.id, o.due_at, o.overdue, o.late_days
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
  returning t.id, t.user_id, t.title, t.due_time, due.overdue, due.late_days;
$$;

revoke all on function public.claim_due_task_reminders(interval)
  from public, anon, authenticated;
grant execute on function public.claim_due_task_reminders(interval) to service_role;

notify pgrst, 'reload schema';
