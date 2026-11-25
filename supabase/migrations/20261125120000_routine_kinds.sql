-- The class schedule becomes a weekly routine: each item has a kind (class,
-- work, training, appointment or other).

alter table public.class_slots
  add column if not exists kind text not null default 'aula';

alter table public.class_slots drop constraint if exists class_slots_kind;
alter table public.class_slots
  add constraint class_slots_kind check (kind in ('aula', 'trabalho', 'treino', 'compromisso', 'outro'));

notify pgrst, 'reload schema';
