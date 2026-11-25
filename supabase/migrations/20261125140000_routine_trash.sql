-- Routine items go to the trash like tasks and notes: deleting sets
-- deleted_at, restoring clears it, and after 7 days they are removed for good.

alter table public.class_slots
  add column if not exists deleted_at timestamptz;

create index if not exists class_slots_deleted_idx
  on public.class_slots (user_id, deleted_at)
  where deleted_at is not null;

select cron.unschedule('flowy-routine-trash')
where exists (select 1 from cron.job where jobname = 'flowy-routine-trash');

select cron.schedule(
  'flowy-routine-trash',
  '23 3 * * *',
  $$delete from public.class_slots where deleted_at <= now() - interval '7 days'$$
);

notify pgrst, 'reload schema';
