-- Engagement notifications, sent by the reminders job (every minute):
-- * 19h: the streak is at risk (a streak, but nothing done today yet);
-- * 12h: someone who did not finish or create a task for 3 days is invited
--   back (at most once every 3 days).
-- Both only for people with notifications on (a push subscription).

alter table public.user_preferences
  add column if not exists engagement_pushes boolean not null default true,
  add column if not exists streak_nudge_sent_on date,
  add column if not exists comeback_sent_on date;

-- The job runs as service_role; it needs the streak rule too.
grant execute on function public.task_streak(uuid, date) to service_role;

create or replace function public.claim_streak_nudges(
  p_hour integer default 19,
  p_window interval default interval '2 hours'
)
returns table (user_id uuid, streak integer)
language sql
set search_path = ''
as $$
  with candidates as (
    select p.user_id, (now() at time zone p.timezone)::date as local_day
    from public.user_preferences p
    where p.engagement_pushes
      and (now() at time zone p.timezone)::time >= make_time(p_hour, 0, 0)
      and (now() at time zone p.timezone)::time < make_time(p_hour, 0, 0) + p_window
      and p.streak_nudge_sent_on is distinct from (now() at time zone p.timezone)::date
      and exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
  ),
  due as (
    select c.user_id, c.local_day, public.task_streak(c.user_id, c.local_day) as streak
    from candidates c
    where not exists (
      select 1 from public.task_completion_days d where d.user_id = c.user_id and d.day = c.local_day
    )
  ),
  claimed as (
    update public.user_preferences p
    set streak_nudge_sent_on = due.local_day
    from due
    where p.user_id = due.user_id and due.streak > 0
    returning p.user_id
  )
  select claimed.user_id, due.streak from claimed join due on due.user_id = claimed.user_id;
$$;
revoke all on function public.claim_streak_nudges(integer, interval) from public, anon, authenticated;
grant execute on function public.claim_streak_nudges(integer, interval) to service_role;

create or replace function public.claim_comeback_nudges(
  p_hour integer default 12,
  p_window interval default interval '2 hours'
)
returns table (user_id uuid)
language sql
set search_path = ''
as $$
  with due as (
    select p.user_id, (now() at time zone p.timezone)::date as local_day
    from public.user_preferences p
    where p.engagement_pushes
      and (now() at time zone p.timezone)::time >= make_time(p_hour, 0, 0)
      and (now() at time zone p.timezone)::time < make_time(p_hour, 0, 0) + p_window
      and (p.comeback_sent_on is null or p.comeback_sent_on <= (now() at time zone p.timezone)::date - 3)
      and exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
      and not exists (
        select 1 from public.task_completion_days d
        where d.user_id = p.user_id and d.day >= (now() at time zone p.timezone)::date - 3
      )
      and not exists (
        select 1 from public.tasks t
        where t.user_id = p.user_id and t.created_at >= now() - interval '3 days'
      )
  )
  update public.user_preferences p
  set comeback_sent_on = due.local_day
  from due
  where p.user_id = due.user_id
  returning p.user_id;
$$;
revoke all on function public.claim_comeback_nudges(integer, interval) from public, anon, authenticated;
grant execute on function public.claim_comeback_nudges(integer, interval) to service_role;

notify pgrst, 'reload schema';
