-- Morning digest: one push a day, at 8:00 in the person's timezone, with how many
-- tasks are due today and how many are overdue, including tasks without a time
-- (which never get an individual reminder). Sent by the same every-minute cron
-- that delivers task reminders (/api/cron/reminders).
alter table public.user_preferences
  add column if not exists morning_digest boolean not null default true,
  add column if not exists morning_digest_sent_on date;

comment on column public.user_preferences.morning_digest is
  'Whether the person gets the 8:00 push with today''s and overdue tasks.';
comment on column public.user_preferences.morning_digest_sent_on is
  'Local date of the last morning digest, so it goes out at most once a day.';

-- Atomically marks and returns the people whose local time is inside the digest
-- window and who have not had today's digest yet, with their counts and the
-- first few task titles (today's first, by time and priority, then overdue).
-- Overlapping cron runs never send it twice. People with nothing to do are
-- marked too, but come back with zero counts so the app skips the push.
create or replace function public.claim_morning_digests(
  p_hour integer default 8,
  p_window interval default interval '3 hours'
)
returns table (
  user_id uuid,
  today_count integer,
  overdue_count integer,
  titles text[]
)
language sql
set search_path = ''
as $$
  with due as (
    select p.user_id, (now() at time zone p.timezone)::date as local_day
    from public.user_preferences p
    where p.morning_digest
      and (now() at time zone p.timezone)::time >= make_time(p_hour, 0, 0)
      and (now() at time zone p.timezone)::time < make_time(p_hour, 0, 0) + p_window
      and p.morning_digest_sent_on is distinct from (now() at time zone p.timezone)::date
      and exists (
        select 1 from public.push_subscriptions s where s.user_id = p.user_id
      )
  ),
  claimed as (
    update public.user_preferences p
    set morning_digest_sent_on = due.local_day
    from due
    where p.user_id = due.user_id
      and p.morning_digest_sent_on is distinct from due.local_day
    returning p.user_id, due.local_day
  )
  select
    c.user_id,
    (
      select count(*)::integer from public.tasks t
      where t.user_id = c.user_id
        and t.deleted_at is null
        and t.status <> 'completed'::public.task_status
        and t.due_date = c.local_day
    ),
    (
      select count(*)::integer from public.tasks t
      where t.user_id = c.user_id
        and t.deleted_at is null
        and t.status <> 'completed'::public.task_status
        and t.due_date < c.local_day
    ),
    array(
      select t.title from public.tasks t
      where t.user_id = c.user_id
        and t.deleted_at is null
        and t.status <> 'completed'::public.task_status
        and t.due_date <= c.local_day
      order by
        (t.due_date = c.local_day) desc,
        t.due_time asc nulls last,
        t.priority desc,
        t.due_date desc,
        t.position asc
      limit 3
    )
  from claimed c;
$$;

revoke all on function public.claim_morning_digests(integer, interval)
  from public, anon, authenticated;
grant execute on function public.claim_morning_digests(integer, interval) to service_role;

notify pgrst, 'reload schema';
