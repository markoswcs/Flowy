-- Server-side trash retention. pg_cron executes this even when no user opens
-- the application. The callable function is not exposed to browser roles.

create extension if not exists pg_cron;

create or replace function public.purge_deleted_items(
  p_retention interval default interval '7 days'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  retention_window interval := greatest(
    coalesce(p_retention, interval '7 days'),
    interval '7 days'
  );
  cutoff timestamptz;
  cards_count bigint := 0;
  columns_count bigint := 0;
  boards_count bigint := 0;
  tasks_count bigint := 0;
  notes_count bigint := 0;
  categories_count bigint := 0;
  folders_count bigint := 0;
begin
  cutoff := statement_timestamp() - retention_window;

  delete from public.board_cards where deleted_at <= cutoff;
  get diagnostics cards_count = row_count;

  delete from public.board_columns where deleted_at <= cutoff;
  get diagnostics columns_count = row_count;

  delete from public.boards where deleted_at <= cutoff;
  get diagnostics boards_count = row_count;

  delete from public.tasks where deleted_at <= cutoff;
  get diagnostics tasks_count = row_count;

  delete from public.notes where deleted_at <= cutoff;
  get diagnostics notes_count = row_count;

  delete from public.categories where deleted_at <= cutoff;
  get diagnostics categories_count = row_count;

  delete from public.folders where deleted_at <= cutoff;
  get diagnostics folders_count = row_count;

  return jsonb_build_object(
    'cutoff', cutoff,
    'board_cards', cards_count,
    'board_columns', columns_count,
    'boards', boards_count,
    'tasks', tasks_count,
    'notes', notes_count,
    'categories', categories_count,
    'folders', folders_count
  );
end;
$$;

revoke all on function public.purge_deleted_items(interval) from public, anon, authenticated;
grant execute on function public.purge_deleted_items(interval) to service_role;

-- The named schedule is idempotent in pg_cron and runs daily at 03:17 UTC.
select cron.schedule(
  'flowy-purge-trash-daily',
  '17 3 * * *',
  'select public.purge_deleted_items();'
);
