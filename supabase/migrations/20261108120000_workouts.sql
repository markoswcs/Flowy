-- Treinos: an optional module. Off until the person turns it on (welcome tour or
-- Settings). The plan itself is built in the app from the profile below, by
-- rules, so only the answers, the adjustments and the log are stored.
alter table public.user_preferences
  add column if not exists workouts_enabled boolean not null default false;

create table if not exists public.workout_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  goal text not null,
  level text not null,
  -- Weekdays the person trains on (0 = Sunday ... 6 = Saturday).
  days smallint[] not null,
  minutes smallint not null,
  place text not null,
  limitations text[] not null default '{}',
  -- Moves with feedback: "fácil" raises it, "difícil" lowers it.
  intensity smallint not null default 0,
  -- Exercises the person swapped: { "<exercise id>": "<replacement id>" }.
  swaps jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_profiles_goal check (goal in ('lose_weight', 'gain_muscle', 'conditioning', 'health')),
  constraint workout_profiles_level check (level in ('beginner', 'intermediate', 'advanced')),
  constraint workout_profiles_days check (
    cardinality(days) between 1 and 7 and days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  constraint workout_profiles_minutes check (minutes between 10 and 120),
  constraint workout_profiles_place check (place in ('home', 'gym', 'outdoor')),
  constraint workout_profiles_limitations check (
    limitations <@ array['knee', 'back', 'shoulder', 'wrist']::text[]
  ),
  constraint workout_profiles_intensity check (intensity between -2 and 4),
  constraint workout_profiles_swaps check (jsonb_typeof(swaps) = 'object')
);

-- One entry per day: trained ("done", with how it felt) or skipped on purpose.
create table if not exists public.workout_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  session text not null,
  status text not null,
  feeling text,
  created_at timestamptz not null default now(),
  constraint workout_logs_one_per_day unique (user_id, day),
  constraint workout_logs_session_length check (char_length(session) between 1 and 40),
  constraint workout_logs_status check (status in ('done', 'skipped')),
  constraint workout_logs_feeling check (feeling is null or feeling in ('easy', 'ok', 'hard'))
);

create index if not exists workout_logs_user_day_idx on public.workout_logs (user_id, day desc);

drop trigger if exists workout_profiles_set_updated_at on public.workout_profiles;
create trigger workout_profiles_set_updated_at
before update on public.workout_profiles
for each row execute function public.set_updated_at();

alter table public.workout_profiles enable row level security;
alter table public.workout_profiles force row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_logs force row level security;

drop policy if exists workout_profiles_manage_own on public.workout_profiles;
create policy workout_profiles_manage_own
on public.workout_profiles for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists workout_logs_manage_own on public.workout_logs;
create policy workout_logs_manage_own
on public.workout_logs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.workout_profiles from public, anon;
revoke all on table public.workout_logs from public, anon;
grant select, insert, update, delete on table public.workout_profiles to authenticated;
grant select, insert, update, delete on table public.workout_logs to authenticated;
grant all on table public.workout_profiles to service_role;
grant all on table public.workout_logs to service_role;

notify pgrst, 'reload schema';
