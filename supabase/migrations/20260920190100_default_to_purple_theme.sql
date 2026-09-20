-- Map old choices to the new explicit palette. This is deliberately a separate
-- migration, because PostgreSQL requires enum values to be committed before
-- they can be used in data changes.
update public.user_preferences
set theme = case theme::text
  when 'light' then 'white'::public.theme_preference
  when 'dark' then 'black'::public.theme_preference
  else 'purple'::public.theme_preference
end
where theme::text in ('light', 'dark', 'system');

alter table public.user_preferences
  alter column theme set default 'purple'::public.theme_preference;
