-- Ranking: every registered person (not only the recently active), except
-- those with a private profile; up to 1000 people.

drop function if exists public.leaderboard();

create or replace function public.leaderboard()
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  streak integer,
  active_days integer,
  trains boolean,
  workouts integer,
  workout_minutes integer,
  is_me boolean,
  visible boolean,
  -- Last 7 days, oldest first: a task was done that day.
  week boolean[],
  cheers integer,
  cheered_today boolean,
  last_active date
)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ),
  people as (
    select p.user_id, p.display_name, p.avatar_url, p.ranking_visible
    from public.profiles p
    -- Everyone with an account, except who made the profile private.
    where p.user_id = (select auth.uid()) or p.ranking_visible
  )
  select
    people.user_id,
    people.display_name,
    people.avatar_url,
    public.task_streak(people.user_id, (select d from today)) as streak,
    (
      select count(*)::integer from public.task_completion_days c
      where c.user_id = people.user_id and c.day > (select d from today) - 30
    ) as active_days,
    exists (select 1 from public.workout_profiles w where w.user_id = people.user_id) as trains,
    (
      select count(*)::integer from public.workout_logs l
      where l.user_id = people.user_id and l.status = 'done' and l.day > (select d from today) - 30
    ) as workouts,
    coalesce((
      select count(*)::integer * max(w.minutes)
      from public.workout_logs l
      join public.workout_profiles w on w.user_id = l.user_id
      where l.user_id = people.user_id and l.status = 'done' and l.day > (select d from today) - 30
    ), 0) as workout_minutes,
    people.user_id = (select auth.uid()) as is_me,
    people.ranking_visible as visible,
    (
      select array_agg(exists (
        select 1 from public.task_completion_days c where c.user_id = people.user_id and c.day = (select d from today) - 6 + g.n
      ) order by g.n)
      from generate_series(0, 6) as g(n)
    ) as week,
    (
      select count(*)::integer from public.streak_cheers s
      where s.to_user = people.user_id and s.day > (select d from today) - 7
    ) as cheers,
    exists (
      select 1 from public.streak_cheers s
      where s.to_user = people.user_id and s.from_user = (select auth.uid()) and s.day = (select d from today)
    ) as cheered_today,
    greatest(
      (select max(c.day) from public.task_completion_days c where c.user_id = people.user_id),
      (select max(l.day) from public.workout_logs l where l.user_id = people.user_id and l.status = 'done')
    ) as last_active
  from people
  order by streak desc, active_days desc, workouts desc
  limit 1000;
$$;
revoke all on function public.leaderboard() from public, anon;
grant execute on function public.leaderboard() to authenticated;

notify pgrst, 'reload schema';
