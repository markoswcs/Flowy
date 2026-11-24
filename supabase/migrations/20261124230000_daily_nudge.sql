-- One gentle nudge a day at most, and only on a day the person forgot: no task
-- finished and none created yet. The time changes every day and per person
-- (between 16:00 and 20:00 local), so it never feels like an alarm.
-- Replaces the 19h streak nudge and the 12h come-back nudge.

drop function if exists public.claim_streak_nudges(integer, interval);
drop function if exists public.claim_comeback_nudges(integer, interval);

create or replace function public.claim_daily_nudges()
returns table (user_id uuid, streak integer)
language sql
set search_path = ''
as $$
  with candidates as (
    select
      p.user_id,
      p.timezone,
      (now() at time zone p.timezone)::date as local_day,
      (now() at time zone p.timezone)::time as local_time,
      -- A minute between 16:00 and 19:59, different each day for each person.
      make_time(16, 0, 0)
        + make_interval(mins => abs(hashtext(p.user_id::text || (now() at time zone p.timezone)::date::text)) % 240)
        as slot
    from public.user_preferences p
    where p.engagement_pushes
      and p.streak_nudge_sent_on is distinct from (now() at time zone p.timezone)::date
      and exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
  ),
  due as (
    select c.user_id, c.local_day, public.task_streak(c.user_id, c.local_day) as streak
    from candidates c
    where c.local_time >= c.slot
      and c.local_time < c.slot + interval '90 minutes'
      and not exists (
        select 1 from public.task_completion_days d where d.user_id = c.user_id and d.day = c.local_day
      )
      and not exists (
        select 1 from public.tasks t
        where t.user_id = c.user_id and t.created_at >= (c.local_day::timestamp at time zone c.timezone)
      )
  ),
  claimed as (
    update public.user_preferences p
    set streak_nudge_sent_on = due.local_day
    from due
    where p.user_id = due.user_id
    returning p.user_id
  )
  select claimed.user_id, due.streak from claimed join due on due.user_id = claimed.user_id;
$$;
revoke all on function public.claim_daily_nudges() from public, anon, authenticated;
grant execute on function public.claim_daily_nudges() to service_role;

notify pgrst, 'reload schema';
