-- The app opens on "Hoje" by default. Existing rows still hold the old default
-- ('all'), which nobody could tell apart from a deliberate choice, so they move too.
alter table public.user_preferences
  alter column default_task_view set default 'today';

update public.user_preferences
set default_task_view = 'today'
where default_task_view = 'all';
