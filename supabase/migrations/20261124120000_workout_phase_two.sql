-- Treinos, fase 2: tipo de série (aquecimento, drop, até a falha), esforço
-- (repetições na reserva), divisão escolhida e modo rodízio.

alter table public.workout_sets
  add column if not exists kind text not null default 'normal',
  add column if not exists rir smallint;

alter table public.workout_sets drop constraint if exists workout_sets_kind_check;
alter table public.workout_sets
  add constraint workout_sets_kind_check check (kind in ('normal', 'warmup', 'drop', 'failure'));

alter table public.workout_sets drop constraint if exists workout_sets_rir_check;
alter table public.workout_sets
  add constraint workout_sets_rir_check check (rir is null or rir between 0 and 5);

alter table public.workout_profiles
  add column if not exists split text not null default 'auto',
  add column if not exists rotation boolean not null default false;

alter table public.workout_profiles drop constraint if exists workout_profiles_split_check;
alter table public.workout_profiles
  add constraint workout_profiles_split_check check (split in ('auto', 'ppl', 'upper_lower', 'full', 'five'));
