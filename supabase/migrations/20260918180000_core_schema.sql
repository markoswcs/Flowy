-- Flowy core schema
-- All application-owned rows carry user_id. RLS is enabled fail-closed here;
-- policies are granted next. Composite keys prevent cross-user relations.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.task_priority as enum ('low', 'normal', 'high');
create type public.task_status as enum ('todo', 'in_progress', 'completed');
create type public.theme_preference as enum ('light', 'dark', 'system');
create type public.task_default_view as enum ('all', 'today', 'upcoming');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Usuário',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (char_length(btrim(display_name)) between 1 and 80),
  constraint profiles_avatar_url_length
    check (avatar_url is null or char_length(avatar_url) <= 2048)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme public.theme_preference not null default 'system',
  sidebar_collapsed boolean not null default false,
  week_starts_on smallint not null default 0,
  default_task_view public.task_default_view not null default 'all',
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_week_starts_on_range
    check (week_starts_on between 0 and 6),
  constraint user_preferences_timezone_length
    check (char_length(timezone) between 1 and 100)
);

create table public.folders (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  position numeric(20, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint folders_owner_key unique (id, user_id),
  constraint folders_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint folders_position_nonnegative check (position >= 0)
);

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#64748B',
  position numeric(20, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint categories_owner_key unique (id, user_id),
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint categories_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint categories_position_nonnegative check (position >= 0)
);

create table public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  due_time time,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'todo',
  folder_id uuid,
  position numeric(20, 6) not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tasks_owner_key unique (id, user_id),
  constraint tasks_title_length check (char_length(btrim(title)) between 1 and 300),
  constraint tasks_description_length
    check (description is null or char_length(description) <= 20000),
  constraint tasks_due_time_requires_date check (due_time is null or due_date is not null),
  constraint tasks_position_nonnegative check (position >= 0),
  constraint tasks_folder_owner_fk
    foreign key (folder_id, user_id)
    references public.folders (id, user_id)
    on delete set null (folder_id)
);

create table public.task_categories (
  task_id uuid not null,
  category_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, category_id),
  constraint task_categories_task_owner_fk
    foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    on delete cascade,
  constraint task_categories_category_owner_fk
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete cascade
);

create table public.notes (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Sem título',
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  plain_text text not null default '',
  folder_id uuid,
  position numeric(20, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint notes_owner_key unique (id, user_id),
  constraint notes_title_length check (char_length(btrim(title)) between 1 and 300),
  constraint notes_plain_text_length check (char_length(plain_text) <= 1000000),
  constraint notes_content_is_object check (jsonb_typeof(content) = 'object'),
  constraint notes_content_size check (octet_length(content::text) <= 5000000),
  constraint notes_position_nonnegative check (position >= 0),
  constraint notes_folder_owner_fk
    foreign key (folder_id, user_id)
    references public.folders (id, user_id)
    on delete set null (folder_id)
);

create table public.note_categories (
  note_id uuid not null,
  category_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, category_id),
  constraint note_categories_note_owner_fk
    foreign key (note_id, user_id)
    references public.notes (id, user_id)
    on delete cascade,
  constraint note_categories_category_owner_fk
    foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete cascade
);

create table public.boards (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  position numeric(20, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint boards_owner_key unique (id, user_id),
  constraint boards_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint boards_position_nonnegative check (position >= 0)
);

create table public.board_columns (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  board_id uuid not null,
  name text not null,
  semantic_status public.task_status,
  position numeric(20, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint board_columns_owner_key unique (id, user_id),
  constraint board_columns_board_owner_key unique (id, board_id, user_id),
  constraint board_columns_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint board_columns_position_nonnegative check (position >= 0),
  constraint board_columns_board_owner_fk
    foreign key (board_id, user_id)
    references public.boards (id, user_id)
    on delete cascade
);

create table public.board_cards (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  board_id uuid not null,
  column_id uuid not null,
  task_id uuid,
  title text,
  description text,
  position numeric(20, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint board_cards_owner_key unique (id, user_id),
  constraint board_cards_has_content
    check (
      task_id is not null
      or (title is not null and char_length(btrim(title)) between 1 and 300)
    ),
  constraint board_cards_title_length
    check (title is null or char_length(btrim(title)) between 1 and 300),
  constraint board_cards_description_length
    check (description is null or char_length(description) <= 20000),
  constraint board_cards_position_nonnegative check (position >= 0),
  constraint board_cards_column_owner_fk
    foreign key (column_id, board_id, user_id)
    references public.board_columns (id, board_id, user_id)
    on delete cascade,
  constraint board_cards_task_owner_fk
    foreign key (task_id, user_id)
    references public.tasks (id, user_id)
    on delete cascade
);

-- Prevent duplicate active names while still allowing an item in the trash to
-- be recreated with the same name.
create unique index folders_active_name_uidx
  on public.folders (user_id, lower(name))
  where deleted_at is null;
create unique index categories_active_name_uidx
  on public.categories (user_id, lower(name))
  where deleted_at is null;
create unique index boards_active_name_uidx
  on public.boards (user_id, lower(name))
  where deleted_at is null;
create unique index board_columns_active_name_uidx
  on public.board_columns (board_id, lower(name))
  where deleted_at is null;
create unique index board_cards_active_task_uidx
  on public.board_cards (board_id, task_id)
  where task_id is not null and deleted_at is null;

-- Query and ordering indexes.
create index folders_owner_position_idx
  on public.folders (user_id, position) where deleted_at is null;
create index folders_deleted_idx
  on public.folders (deleted_at) where deleted_at is not null;
create index categories_owner_position_idx
  on public.categories (user_id, position) where deleted_at is null;
create index categories_deleted_idx
  on public.categories (deleted_at) where deleted_at is not null;
create index tasks_owner_status_due_idx
  on public.tasks (user_id, status, due_date, due_time) where deleted_at is null;
create index tasks_owner_folder_idx
  on public.tasks (user_id, folder_id, position) where deleted_at is null;
create index tasks_owner_priority_idx
  on public.tasks (user_id, priority, updated_at desc) where deleted_at is null;
create index tasks_deleted_idx
  on public.tasks (deleted_at) where deleted_at is not null;
create index task_categories_owner_category_idx
  on public.task_categories (user_id, category_id, task_id);
create index notes_owner_updated_idx
  on public.notes (user_id, updated_at desc) where deleted_at is null;
create index notes_owner_folder_idx
  on public.notes (user_id, folder_id, position) where deleted_at is null;
create index notes_deleted_idx
  on public.notes (deleted_at) where deleted_at is not null;
create index note_categories_owner_category_idx
  on public.note_categories (user_id, category_id, note_id);
create index boards_owner_position_idx
  on public.boards (user_id, position) where deleted_at is null;
create index boards_deleted_idx
  on public.boards (deleted_at) where deleted_at is not null;
create index board_columns_board_position_idx
  on public.board_columns (user_id, board_id, position) where deleted_at is null;
create index board_columns_deleted_idx
  on public.board_columns (deleted_at) where deleted_at is not null;
create index board_cards_column_position_idx
  on public.board_cards (user_id, board_id, column_id, position) where deleted_at is null;
create index board_cards_task_idx
  on public.board_cards (user_id, task_id) where task_id is not null and deleted_at is null;
create index board_cards_deleted_idx
  on public.board_cards (deleted_at) where deleted_at is not null;

-- Trigram indexes support responsive partial matching (for example, "facul").
create index folders_name_trgm_idx
  on public.folders using gin (lower(name) extensions.gin_trgm_ops);
create index tasks_title_trgm_idx
  on public.tasks using gin (lower(title) extensions.gin_trgm_ops);
create index tasks_description_trgm_idx
  on public.tasks using gin (lower(coalesce(description, '')) extensions.gin_trgm_ops);
create index notes_title_trgm_idx
  on public.notes using gin (lower(title) extensions.gin_trgm_ops);
create index notes_plain_text_trgm_idx
  on public.notes using gin (lower(plain_text) extensions.gin_trgm_ops);
create index boards_name_trgm_idx
  on public.boards using gin (lower(name) extensions.gin_trgm_ops);
create index board_cards_title_trgm_idx
  on public.board_cards using gin (lower(coalesce(title, '')) extensions.gin_trgm_ops);
create index board_cards_description_trgm_idx
  on public.board_cards using gin (lower(coalesce(description, '')) extensions.gin_trgm_ops);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_task_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed'::public.task_status then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.sync_linked_task_from_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapped_status public.task_status;
begin
  if new.deleted_at is not null or new.task_id is null then
    return new;
  end if;

  select c.semantic_status
    into mapped_status
    from public.board_columns as c
   where c.id = new.column_id
     and c.user_id = new.user_id
     and c.deleted_at is null;

  if mapped_status is not null then
    update public.tasks
       set status = mapped_status
     where id = new.task_id
       and user_id = new.user_id
       and deleted_at is null;
  end if;

  return new;
end;
$$;

create or replace function public.normalize_board_card()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- A linked task is the source of truth for its title. This avoids stale
  -- duplicated content while standalone cards keep their own title.
  if new.task_id is not null then
    new.title := null;
  elsif new.title is not null then
    new.title := btrim(new.title);
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  profile_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuário'
    ),
    80
  );

  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    profile_name,
    left(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), 2048)
  )
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();
create trigger folders_set_updated_at
before update on public.folders
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();
create trigger tasks_sync_completion
before insert or update of status, completed_at on public.tasks
for each row execute function public.sync_task_completion();
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();
create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();
create trigger boards_set_updated_at
before update on public.boards
for each row execute function public.set_updated_at();
create trigger board_columns_set_updated_at
before update on public.board_columns
for each row execute function public.set_updated_at();
create trigger board_cards_set_updated_at
before update on public.board_cards
for each row execute function public.set_updated_at();
create trigger board_cards_normalize
before insert or update of title, task_id on public.board_cards
for each row execute function public.normalize_board_card();
create trigger board_cards_sync_linked_task
after insert or update of column_id, task_id, deleted_at on public.board_cards
for each row execute function public.sync_linked_task_from_card();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill profiles/preferences when applying the migration to a project that
-- already has Auth users.
insert into public.profiles (user_id, display_name, avatar_url)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Usuário'
    ),
    80
  ),
  left(nullif(u.raw_user_meta_data ->> 'avatar_url', ''), 2048)
from auth.users as u
on conflict (user_id) do nothing;

insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Fail closed between migrations. If a later policy/grant migration fails,
-- browser roles still cannot read or mutate newly created private tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_preferences', 'folders', 'categories', 'tasks',
    'task_categories', 'notes', 'note_categories', 'boards',
    'board_columns', 'board_cards'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format(
      'revoke all on table public.%I from public, anon, authenticated',
      table_name
    );
  end loop;
end;
$$;

comment on column public.notes.content is
  'Rich-text editor document JSON. plain_text stores the searchable text projection.';
comment on column public.board_columns.semantic_status is
  'When non-null, moving a linked card to this column synchronizes the task status.';
comment on column public.board_cards.title is
  'Standalone-card title. Always normalized to null when task_id is present.';
