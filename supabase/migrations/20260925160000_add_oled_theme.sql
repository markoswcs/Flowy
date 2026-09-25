-- New enum values must be added in a separate migration after deployments.
alter type public.theme_preference add value if not exists 'oled';
