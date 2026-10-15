-- Mind map notes. The map (nodes, cross-links and summaries) is stored as the
-- Mind Elixir JSON document in mindmap_data; plain_text keeps the node topics
-- so the notes search keeps working.
alter table public.notes
  add column if not exists mindmap_data text;

alter table public.notes
  drop constraint if exists notes_kind_check,
  add constraint notes_kind_check
    check (kind in ('text', 'excalidraw', 'mindmap'));

alter table public.notes
  drop constraint if exists notes_mindmap_data_length,
  add constraint notes_mindmap_data_length
    check (mindmap_data is null or char_length(mindmap_data) <= 2000000);

notify pgrst, 'reload schema';
