-- Engagement: days with something done (streak), the evening "anything for
-- tomorrow?" prompt, the class schedule and public read-only lists.

-- 1. Days with at least one task done. A repeating task goes back to "todo"
-- with its next date as soon as it is completed, so completed_at alone loses
-- it; this log keeps the day. Named to run before tasks_advance_recurrence.
create table if not exists public.task_completion_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table public.task_completion_days enable row level security;

drop policy if exists task_completion_days_select_own on public.task_completion_days;
create policy task_completion_days_select_own on public.task_completion_days
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.log_task_completion_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed'::public.task_status
    and old.status is distinct from 'completed'::public.task_status then
    insert into public.task_completion_days (user_id, day)
    values (
      new.user_id,
      (now() at time zone coalesce(
        (select p.timezone from public.user_preferences p where p.user_id = new.user_id),
        'America/Sao_Paulo'
      ))::date
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_a_log_completion_day on public.tasks;
create trigger tasks_a_log_completion_day
  before update of status on public.tasks
  for each row execute function public.log_task_completion_day();

-- Days already known from tasks done before this log existed.
insert into public.task_completion_days (user_id, day)
select t.user_id, (t.completed_at at time zone coalesce(p.timezone, 'America/Sao_Paulo'))::date
from public.tasks t
left join public.user_preferences p on p.user_id = t.user_id
where t.completed_at is not null
on conflict do nothing;

-- 2. Evening prompt: at 21h, "anything for tomorrow?". Off until turned on.
alter table public.user_preferences
  add column if not exists evening_prompt boolean not null default false,
  add column if not exists evening_prompt_sent_on date;

create or replace function public.claim_evening_prompts(
  p_hour integer default 21,
  p_window interval default interval '2 hours'
)
returns table (user_id uuid)
language sql
set search_path = ''
as $$
  with due as (
    select p.user_id, (now() at time zone p.timezone)::date as local_day
    from public.user_preferences p
    where p.evening_prompt
      and (now() at time zone p.timezone)::time >= make_time(p_hour, 0, 0)
      and (now() at time zone p.timezone)::time < make_time(p_hour, 0, 0) + p_window
      and p.evening_prompt_sent_on is distinct from (now() at time zone p.timezone)::date
      and exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
  )
  update public.user_preferences p
  set evening_prompt_sent_on = due.local_day
  from due
  where p.user_id = due.user_id
    and p.evening_prompt_sent_on is distinct from due.local_day
  returning p.user_id;
$$;
revoke all on function public.claim_evening_prompts(integer, interval) from public, anon, authenticated;
grant execute on function public.claim_evening_prompts(integer, interval) to service_role;

-- 3. Class schedule: fixed weekly classes.
create table if not exists public.class_slots (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  room text,
  weekday smallint not null,
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now(),
  constraint class_slots_name check (char_length(btrim(name)) between 1 and 80),
  constraint class_slots_room check (room is null or char_length(room) <= 60),
  constraint class_slots_weekday check (weekday between 0 and 6),
  constraint class_slots_times check (ends_at > starts_at)
);

create index if not exists class_slots_user_idx on public.class_slots (user_id, weekday, starts_at);

alter table public.class_slots enable row level security;

drop policy if exists class_slots_own on public.class_slots;
create policy class_slots_own on public.class_slots
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 4. Public lists: anyone with the link sees a folder's open tasks (titles
-- only) and can copy them into their own Flowy.
create table if not exists public.shared_lists (
  token text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  folder_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint shared_lists_folder_owner_fk
    foreign key (folder_id, user_id) references public.folders (id, user_id) on delete cascade,
  constraint shared_lists_one_per_folder unique (folder_id)
);

alter table public.shared_lists enable row level security;

drop policy if exists shared_lists_own on public.shared_lists;
create policy shared_lists_own on public.shared_lists
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.get_shared_list(p_token text)
returns table (folder_name text, owner_name text, titles text[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.name,
    coalesce((select pr.display_name from public.profiles pr where pr.user_id = s.user_id), 'Alguém'),
    array(
      select t.title from public.tasks t
      where t.folder_id = s.folder_id
        and t.user_id = s.user_id
        and t.deleted_at is null
        and t.status <> 'completed'::public.task_status
      order by t.position asc, t.created_at asc
      limit 200
    )
  from public.shared_lists s
  join public.folders f on f.id = s.folder_id and f.deleted_at is null
  where s.token = p_token;
$$;
revoke all on function public.get_shared_list(text) from public;
grant execute on function public.get_shared_list(text) to anon, authenticated;

notify pgrst, 'reload schema';
