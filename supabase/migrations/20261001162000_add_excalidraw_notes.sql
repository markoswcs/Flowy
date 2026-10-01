alter table public.notes
  add column if not exists kind text not null default 'text',
  add column if not exists excalidraw_data text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notes_kind_check'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_kind_check
      check (kind in ('text', 'excalidraw'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notes_excalidraw_data_length'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_excalidraw_data_length
      check (excalidraw_data is null or char_length(excalidraw_data) <= 2000000);
  end if;
end;
$$;

notify pgrst, 'reload schema';
