-- RLS, least-privilege grants, atomic board operations, and global search.

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_preferences enable row level security;
alter table public.user_preferences force row level security;
alter table public.folders enable row level security;
alter table public.folders force row level security;
alter table public.categories enable row level security;
alter table public.categories force row level security;
alter table public.tasks enable row level security;
alter table public.tasks force row level security;
alter table public.task_categories enable row level security;
alter table public.task_categories force row level security;
alter table public.note_categories enable row level security;
alter table public.note_categories force row level security;
alter table public.notes enable row level security;
alter table public.notes force row level security;
alter table public.boards enable row level security;
alter table public.boards force row level security;
alter table public.board_columns enable row level security;
alter table public.board_columns force row level security;
alter table public.board_cards enable row level security;
alter table public.board_cards force row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy user_preferences_select_own
on public.user_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy user_preferences_insert_own
on public.user_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy user_preferences_update_own
on public.user_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy folders_manage_own
on public.folders for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy categories_manage_own
on public.categories for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy tasks_manage_own
on public.tasks for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy task_categories_manage_own
on public.task_categories for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy note_categories_manage_own
on public.note_categories for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy notes_manage_own
on public.notes for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy boards_manage_own
on public.boards for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy board_columns_manage_own
on public.board_columns for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy board_cards_manage_own
on public.board_cards for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Soft delete is a database invariant, not only a frontend convention.
-- Restrictive policies combine with the ownership policies above.
create policy folders_delete_only_from_trash
on public.folders as restrictive for delete to authenticated
using ((select auth.uid()) = user_id and deleted_at is not null);

create policy categories_delete_only_from_trash
on public.categories as restrictive for delete to authenticated
using ((select auth.uid()) = user_id and deleted_at is not null);

create policy tasks_delete_only_from_trash
on public.tasks as restrictive for delete to authenticated
using ((select auth.uid()) = user_id and deleted_at is not null);

create policy notes_delete_only_from_trash
on public.notes as restrictive for delete to authenticated
using ((select auth.uid()) = user_id and deleted_at is not null);

create policy boards_delete_only_from_trash
on public.boards as restrictive for delete to authenticated
using ((select auth.uid()) = user_id and deleted_at is not null);

create policy board_columns_delete_only_from_trash
on public.board_columns as restrictive for delete to authenticated
using ((select auth.uid()) = user_id and deleted_at is not null);

create policy board_cards_delete_only_from_trash
on public.board_cards as restrictive for delete to authenticated
using ((select auth.uid()) = user_id and deleted_at is not null);

-- No application table is readable by anon. Authenticated receives only the
-- SQL privileges needed by the API; RLS still filters every row.
revoke all on table public.profiles from public, anon;
revoke all on table public.user_preferences from public, anon;
revoke all on table public.folders from public, anon;
revoke all on table public.categories from public, anon;
revoke all on table public.tasks from public, anon;
revoke all on table public.task_categories from public, anon;
revoke all on table public.note_categories from public, anon;
revoke all on table public.notes from public, anon;
revoke all on table public.boards from public, anon;
revoke all on table public.board_columns from public, anon;
revoke all on table public.board_cards from public, anon;

grant usage on schema public to authenticated;
grant usage on schema extensions to authenticated, service_role;
revoke all on type public.task_priority from public, anon;
revoke all on type public.task_status from public, anon;
revoke all on type public.theme_preference from public, anon;
revoke all on type public.task_default_view from public, anon;
grant usage on type public.task_priority to authenticated, service_role;
grant usage on type public.task_status to authenticated, service_role;
grant usage on type public.theme_preference to authenticated, service_role;
grant usage on type public.task_default_view to authenticated, service_role;
grant execute on function extensions.gen_random_uuid() to authenticated, service_role;
grant execute on function extensions.similarity(text, text) to authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_preferences to authenticated;
grant select, insert, update, delete on table public.folders to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.task_categories to authenticated;
grant select, insert, update, delete on table public.note_categories to authenticated;
grant select, insert, update, delete on table public.notes to authenticated;
grant select, insert, update, delete on table public.boards to authenticated;
grant select, insert, update, delete on table public.board_columns to authenticated;
grant select, insert, update, delete on table public.board_cards to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.user_preferences to service_role;
grant all on table public.folders to service_role;
grant all on table public.categories to service_role;
grant all on table public.tasks to service_role;
grant all on table public.task_categories to service_role;
grant all on table public.note_categories to service_role;
grant all on table public.notes to service_role;
grant all on table public.boards to service_role;
grant all on table public.board_columns to service_role;
grant all on table public.board_cards to service_role;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_task_completion() from public, anon, authenticated;
revoke execute on function public.sync_linked_task_from_card() from public, anon, authenticated;
revoke execute on function public.normalize_board_card() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

create or replace function public.create_board_with_defaults(board_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_board_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if char_length(btrim(coalesce(board_name, ''))) not between 1 and 120 then
    raise exception 'board name must contain between 1 and 120 characters'
      using errcode = '22023';
  end if;

  insert into public.boards (user_id, name, position)
  values (
    current_user_id,
    btrim(board_name),
    extract(epoch from clock_timestamp()) * 1000
  )
  returning id into created_board_id;

  insert into public.board_columns
    (user_id, board_id, name, semantic_status, position)
  values
    (current_user_id, created_board_id, 'A fazer', 'todo', 1000),
    (current_user_id, created_board_id, 'Em andamento', 'in_progress', 2000),
    (current_user_id, created_board_id, 'Concluído', 'completed', 3000);

  return created_board_id;
end;
$$;

create or replace function public.move_board_card(
  target_card_id uuid,
  target_column_id uuid,
  target_position numeric
)
returns public.board_cards
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  source_board_id uuid;
  target_board_id uuid;
  moved_card public.board_cards%rowtype;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if target_position is null or target_position < 0 then
    raise exception 'position must be nonnegative' using errcode = '22023';
  end if;

  select source_column.board_id
    into source_board_id
    from public.board_cards as card
    join public.board_columns as source_column
      on source_column.id = card.column_id
     and source_column.user_id = card.user_id
   where card.id = target_card_id
     and card.user_id = current_user_id
     and card.deleted_at is null
     and source_column.deleted_at is null
   for update of card;

  if source_board_id is null then
    raise exception 'active card not found' using errcode = 'P0002';
  end if;

  select target_column.board_id
    into target_board_id
    from public.board_columns as target_column
   where target_column.id = target_column_id
     and target_column.user_id = current_user_id
     and target_column.deleted_at is null
   for key share;

  if target_board_id is null then
    raise exception 'active target column not found' using errcode = 'P0002';
  end if;

  if source_board_id <> target_board_id then
    raise exception 'a card cannot be moved between different boards'
      using errcode = '22023';
  end if;

  update public.board_cards
     set column_id = target_column_id,
         position = target_position
   where id = target_card_id
     and user_id = current_user_id
     and deleted_at is null
  returning * into moved_card;

  return moved_card;
end;
$$;

create or replace function public.reorder_board_columns(
  target_board_id uuid,
  ordered_column_ids uuid[]
)
returns setof public.board_columns
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  requested_count integer := coalesce(cardinality(ordered_column_ids), 0);
  active_count integer;
  distinct_count integer;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  perform 1
    from public.boards
   where id = target_board_id
     and user_id = current_user_id
     and deleted_at is null
   for update;

  if not found then
    raise exception 'active board not found' using errcode = 'P0002';
  end if;

  -- Lock the current set while validating it. The board lock also blocks a
  -- concurrent column insert through its foreign-key key-share lock.
  perform 1
    from public.board_columns
   where board_id = target_board_id
     and user_id = current_user_id
     and deleted_at is null
   for update;

  select count(*)::integer
    into active_count
    from public.board_columns
   where board_id = target_board_id
     and user_id = current_user_id
     and deleted_at is null;

  select count(distinct requested.id)::integer
    into distinct_count
    from unnest(coalesce(ordered_column_ids, array[]::uuid[])) as requested(id);

  if requested_count <> active_count or distinct_count <> active_count then
    raise exception 'ordered_ids must contain every active column exactly once'
      using errcode = '22023';
  end if;

  if exists (
    select 1
      from unnest(ordered_column_ids) as requested(id)
     where not exists (
       select 1
         from public.board_columns as column_row
        where column_row.id = requested.id
          and column_row.board_id = target_board_id
          and column_row.user_id = current_user_id
          and column_row.deleted_at is null
     )
  ) then
    raise exception 'ordered_ids contains a column outside this board'
      using errcode = '22023';
  end if;

  update public.board_columns as column_row
     set position = requested.ordinality * 1000
    from unnest(ordered_column_ids) with ordinality as requested(id, ordinality)
   where column_row.id = requested.id
     and column_row.board_id = target_board_id
     and column_row.user_id = current_user_id;

  return query
  select column_row.*
    from public.board_columns as column_row
   where column_row.board_id = target_board_id
     and column_row.user_id = current_user_id
     and column_row.deleted_at is null
   order by column_row.position, column_row.created_at, column_row.id;
end;
$$;

create or replace function public.global_search(
  search_query text,
  result_limit integer default 30
)
returns table (
  entity_type text,
  id uuid,
  title text,
  excerpt text,
  updated_at timestamptz,
  parent_id uuid,
  relevance real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select left(lower(btrim(coalesce(search_query, ''))), 100) as query_text
  ),
  matches as (
    select
      'task'::text as entity_type,
      task.id,
      task.title,
      left(coalesce(task.description, ''), 240) as excerpt,
      task.updated_at,
      task.folder_id as parent_id,
      greatest(
        extensions.similarity(lower(task.title), input.query_text),
        extensions.similarity(lower(coalesce(task.description, '')), input.query_text) * 0.45
      )::real as relevance
    from public.tasks as task
    cross join input
    where task.user_id = (select auth.uid())
      and task.deleted_at is null
      and input.query_text <> ''
      and (
        lower(task.title) like '%' || input.query_text || '%'
        or lower(coalesce(task.description, '')) like '%' || input.query_text || '%'
      )

    union all

    select
      'note'::text,
      note.id,
      note.title,
      left(note.plain_text, 240),
      note.updated_at,
      note.folder_id,
      greatest(
        extensions.similarity(lower(note.title), input.query_text),
        extensions.similarity(lower(note.plain_text), input.query_text) * 0.45
      )::real
    from public.notes as note
    cross join input
    where note.user_id = (select auth.uid())
      and note.deleted_at is null
      and input.query_text <> ''
      and (
        lower(note.title) like '%' || input.query_text || '%'
        or lower(note.plain_text) like '%' || input.query_text || '%'
      )

    union all

    select
      'folder'::text,
      folder.id,
      folder.name,
      null::text,
      folder.updated_at,
      null::uuid,
      extensions.similarity(lower(folder.name), input.query_text)::real
    from public.folders as folder
    cross join input
    where folder.user_id = (select auth.uid())
      and folder.deleted_at is null
      and input.query_text <> ''
      and lower(folder.name) like '%' || input.query_text || '%'

    union all

    select
      'card'::text,
      card.id,
      coalesce(card.title, linked_task.title),
      left(coalesce(card.description, linked_task.description, ''), 240),
      card.updated_at,
      card.board_id,
      greatest(
        extensions.similarity(
          lower(coalesce(card.title, linked_task.title, '')),
          input.query_text
        ),
        extensions.similarity(
          lower(coalesce(card.description, linked_task.description, '')),
          input.query_text
        ) * 0.45
      )::real
    from public.board_cards as card
    join public.board_columns as column_row
      on column_row.id = card.column_id
     and column_row.user_id = card.user_id
     and column_row.deleted_at is null
    join public.boards as board
      on board.id = card.board_id
     and board.user_id = column_row.user_id
     and board.deleted_at is null
    left join public.tasks as linked_task
      on linked_task.id = card.task_id
     and linked_task.user_id = card.user_id
     and linked_task.deleted_at is null
    cross join input
    where card.user_id = (select auth.uid())
      and card.deleted_at is null
      and (card.task_id is null or linked_task.id is not null)
      and input.query_text <> ''
      and (
        lower(coalesce(card.title, linked_task.title, '')) like '%' || input.query_text || '%'
        or lower(coalesce(card.description, linked_task.description, '')) like '%' || input.query_text || '%'
      )
  )
  select
    matches.entity_type,
    matches.id,
    matches.title,
    matches.excerpt,
    matches.updated_at,
    matches.parent_id,
    matches.relevance
  from matches
  order by matches.relevance desc, matches.updated_at desc, matches.id
  limit least(greatest(coalesce(result_limit, 30), 1), 50);
$$;

revoke all on function public.create_board_with_defaults(text) from public, anon;
revoke all on function public.move_board_card(uuid, uuid, numeric) from public, anon;
revoke all on function public.reorder_board_columns(uuid, uuid[]) from public, anon;
revoke all on function public.global_search(text, integer) from public, anon;

grant execute on function public.create_board_with_defaults(text) to authenticated;
grant execute on function public.move_board_card(uuid, uuid, numeric) to authenticated;
grant execute on function public.reorder_board_columns(uuid, uuid[]) to authenticated;
grant execute on function public.global_search(text, integer) to authenticated;

-- Realtime changes are still authorized by the table RLS policies. Add only
-- collaboration-sensitive tables, not every lookup indiscriminately.
do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'folders', 'categories', 'tasks', 'task_categories', 'notes', 'note_categories',
      'boards', 'board_columns', 'board_cards', 'user_preferences'
    ]
    loop
      -- The client filters by user_id. FULL keeps that filter usable for
      -- DELETE events while Realtime still limits RLS-protected old payloads.
      execute format(
        'alter table public.%I replica identity full',
        table_name
      );

      if not exists (
        select 1
          from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = table_name
      ) then
        execute format(
          'alter publication supabase_realtime add table public.%I',
          table_name
        );
      end if;
    end loop;
  end if;
end;
$$;
