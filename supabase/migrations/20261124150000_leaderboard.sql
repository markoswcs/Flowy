-- Ranking: everyone's streak and training of the last 30 days, for those who
-- did not make their profile private. Only the name, photo and numbers leave
-- the database; never the e-mail.

alter table public.profiles
  add column if not exists ranking_visible boolean not null default true;

-- The streak with the app's rule: a single missed day is skipped, two in a row
-- end it; it counts from today, yesterday or the day before.
create or replace function public.task_streak(target uuid, today date)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cursor_day date;
  total integer := 0;
begin
  if exists (select 1 from public.task_completion_days d where d.user_id = target and d.day = today) then
    cursor_day := today;
  elsif exists (select 1 from public.task_completion_days d where d.user_id = target and d.day = today - 1) then
    cursor_day := today - 1;
  elsif exists (select 1 from public.task_completion_days d where d.user_id = target and d.day = today - 2) then
    cursor_day := today - 2;
  else
    return 0;
  end if;
  loop
    if exists (select 1 from public.task_completion_days d where d.user_id = target and d.day = cursor_day) then
      total := total + 1;
      cursor_day := cursor_day - 1;
    elsif exists (select 1 from public.task_completion_days d where d.user_id = target and d.day = cursor_day - 1) then
      cursor_day := cursor_day - 1;
    else
      exit;
    end if;
    exit when total > 3650;
  end loop;
  return total;
end;
$$;
revoke all on function public.task_streak(uuid, date) from public, anon, authenticated;

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
  visible boolean
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
    where p.user_id = (select auth.uid())
      or (
        p.ranking_visible
        -- Only people active in the last 60 days, so the list stays alive.
        and (
          exists (select 1 from public.task_completion_days c where c.user_id = p.user_id and c.day > (select d from today) - 60)
          or exists (select 1 from public.workout_logs l where l.user_id = p.user_id and l.day > (select d from today) - 60)
        )
      )
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
    people.ranking_visible as visible
  from people
  order by streak desc, active_days desc, workouts desc
  limit 100;
$$;
revoke all on function public.leaderboard() from public, anon;
grant execute on function public.leaderboard() to authenticated;

notify pgrst, 'reload schema';
