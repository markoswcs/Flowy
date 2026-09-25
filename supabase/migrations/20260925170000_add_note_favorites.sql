alter table public.notes
  add column if not exists is_favorite boolean not null default false;

create index if not exists notes_owner_favorite_updated_idx
  on public.notes (user_id, is_favorite desc, updated_at desc)
  where deleted_at is null;
