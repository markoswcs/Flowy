-- 1. pg_cron keeps a row for every run; at one run a minute it had grown to
-- 86% of the database and pushed memory past what the plan has (the outage of
-- 2026-11-16). Keep only the last 6 hours, cleaned every hour.
delete from cron.job_run_details where end_time < now() - interval '6 hours';

select cron.schedule(
  'flowy-cron-history-cleanup',
  '17 * * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '6 hours'$$
);

-- 2. The trigger function is not meant to be called through the API.
revoke execute on function public.log_task_completion_day() from public, anon, authenticated;

-- 3. Who can send announcements to everyone. Rows are added by hand in the SQL
-- editor (insert ... select id from auth.users where email = '...').
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.app_admins enable row level security;
-- No policies: only the server (service role) reads it.

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- 4. Announcements: everyone signed in reads them; only the server writes.
create table if not exists public.announcements (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint announcements_title check (char_length(btrim(title)) between 1 and 80),
  constraint announcements_body check (char_length(btrim(body)) between 1 and 500)
);
create index if not exists announcements_created_idx on public.announcements (created_at desc);
alter table public.announcements enable row level security;

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
  for select to authenticated using (true);

notify pgrst, 'reload schema';
