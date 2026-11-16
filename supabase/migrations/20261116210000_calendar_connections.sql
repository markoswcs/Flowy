-- Direct calendar connections (Google Agenda): the refresh token Google gives
-- when someone taps "Conectar Google Agenda". Only the server reads it.
create table if not exists public.calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'google',
  refresh_token text not null,
  account_email text,
  created_at timestamptz not null default now(),
  constraint calendar_connections_provider check (provider in ('google'))
);

alter table public.calendar_connections enable row level security;
-- No policies: browsers never see the token; the server uses the service role.
revoke all on table public.calendar_connections from anon, authenticated;

notify pgrst, 'reload schema';
