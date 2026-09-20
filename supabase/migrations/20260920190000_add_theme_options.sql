-- Keep the enum append-only so existing installations can migrate safely.
alter type public.theme_preference add value if not exists 'purple';
alter type public.theme_preference add value if not exists 'black';
alter type public.theme_preference add value if not exists 'white';
