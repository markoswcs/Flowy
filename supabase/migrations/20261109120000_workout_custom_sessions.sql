-- Treinos: workouts the person edited by hand. Each entry replaces the workout
-- the app builds for that session key, with the exercises in the person's order:
-- { "<session key>": [{ "id": "<exercise id>", "sets": 3, "amount": 12, "rest": 60 }] }
alter table public.workout_profiles
  add column if not exists custom_sessions jsonb not null default '{}'::jsonb;

alter table public.workout_profiles
  drop constraint if exists workout_profiles_custom_sessions;

alter table public.workout_profiles
  add constraint workout_profiles_custom_sessions check (
    jsonb_typeof(custom_sessions) = 'object' and pg_column_size(custom_sessions) < 65536
  );
