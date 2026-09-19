alter table public.folders
  add column if not exists parent_id uuid;

alter table public.folders
  drop constraint if exists folders_parent_not_self,
  add constraint folders_parent_not_self
    check (parent_id is null or parent_id <> id);

alter table public.folders
  drop constraint if exists folders_parent_owner_fk,
  add constraint folders_parent_owner_fk
    foreign key (parent_id, user_id)
    references public.folders (id, user_id)
    on delete cascade;

create index if not exists folders_parent_position_idx
  on public.folders (user_id, parent_id, position)
  where deleted_at is null;

create index if not exists folders_parent_owner_idx
  on public.folders (parent_id, user_id)
  where parent_id is not null;

notify pgrst, 'reload schema';
