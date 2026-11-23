-- Treinos, fase 1: each set the person logs (reps, weight or time) and their
-- body weight over time, with an optional goal.
create table if not exists public.workout_sets (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  exercise_id text not null,
  set_number smallint not null,
  -- Repetitions, or seconds / minutes for exercises done by time.
  amount smallint not null,
  -- Extra load in kg; null for body weight only.
  weight_kg numeric(6, 2),
  created_at timestamptz not null default now(),
  constraint workout_sets_exercise check (char_length(exercise_id) between 1 and 60),
  constraint workout_sets_number check (set_number between 1 and 30),
  constraint workout_sets_amount check (amount between 0 and 999),
  constraint workout_sets_weight check (weight_kg is null or weight_kg between 0 and 1000),
  constraint workout_sets_one unique (user_id, day, exercise_id, set_number)
);

create index if not exists workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id, day desc);
create index if not exists workout_sets_user_day_idx on public.workout_sets (user_id, day desc);

create table if not exists public.body_weights (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  weight_kg numeric(5, 2) not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day),
  constraint body_weights_range check (weight_kg between 20 and 400)
);

alter table public.workout_profiles
  add column if not exists body_weight_goal numeric(5, 2);
alter table public.workout_profiles
  drop constraint if exists workout_profiles_weight_goal,
  add constraint workout_profiles_weight_goal check (body_weight_goal is null or body_weight_goal between 20 and 400);

alter table public.workout_sets enable row level security;
alter table public.workout_sets force row level security;
alter table public.body_weights enable row level security;
alter table public.body_weights force row level security;

drop policy if exists workout_sets_manage_own on public.workout_sets;
create policy workout_sets_manage_own on public.workout_sets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists body_weights_manage_own on public.body_weights;
create policy body_weights_manage_own on public.body_weights for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on table public.workout_sets from public, anon;
revoke all on table public.body_weights from public, anon;
grant select, insert, update, delete on table public.workout_sets to authenticated;
grant select, insert, update, delete on table public.body_weights to authenticated;
grant all on table public.workout_sets to service_role;
grant all on table public.body_weights to service_role;

notify pgrst, 'reload schema';
