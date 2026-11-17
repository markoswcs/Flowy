-- Several Google accounts per person (personal and work, for example): one
-- row per account instead of one per person.
alter table public.calendar_connections drop constraint if exists calendar_connections_pkey;
alter table public.calendar_connections add column if not exists id uuid not null default extensions.gen_random_uuid();
alter table public.calendar_connections add constraint calendar_connections_pkey primary key (id);

update public.calendar_connections set account_email = 'google' where account_email is null;
alter table public.calendar_connections alter column account_email set not null;

create unique index if not exists calendar_connections_user_account
  on public.calendar_connections (user_id, account_email);

notify pgrst, 'reload schema';
