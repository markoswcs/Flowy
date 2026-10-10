create table if not exists public.excalidraw_libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  library_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint excalidraw_libraries_items_array
    check (jsonb_typeof(library_items) = 'array')
);

create trigger excalidraw_libraries_set_updated_at
before update on public.excalidraw_libraries
for each row execute function public.set_updated_at();

alter table public.excalidraw_libraries enable row level security;
alter table public.excalidraw_libraries force row level security;

create policy excalidraw_libraries_manage_own
on public.excalidraw_libraries for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.excalidraw_libraries from public, anon;
grant select, insert, update, delete on table public.excalidraw_libraries to authenticated;
grant all on table public.excalidraw_libraries to service_role;
