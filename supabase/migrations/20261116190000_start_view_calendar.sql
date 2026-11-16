-- The calendar can be the first tab people see when they open Flowy.
alter type public.task_default_view add value if not exists 'calendar';
notify pgrst, 'reload schema';
