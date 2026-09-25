alter table public.notes
  add column if not exists color text,
  add column if not exists drawing_data text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notes_color_hex'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_color_hex
      check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'notes_drawing_data_length'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_drawing_data_length
      check (drawing_data is null or char_length(drawing_data) <= 2000000);
  end if;
end;
$$;

notify pgrst, 'reload schema';
