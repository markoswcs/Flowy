-- Web Push reminders for tasks with a due time.
-- Each browser/device that enables notifications stores one subscription. Every minute
-- pg_cron pings the app (/api/cron/reminders), which claims the tasks that are due and
-- sends the pushes. Setup of the URL and secret lives in supabase/README.md.
create extension if not exists pg_net;

create table public.push_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_length
    check (char_length(endpoint) between 1 and 2048),
  constraint push_subscriptions_keys_length
    check (char_length(p256dh) <= 512 and char_length(auth) <= 512),
  constraint push_subscriptions_user_agent_length
    check (user_agent is null or char_length(user_agent) <= 512)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;

create policy push_subscriptions_select_own
on public.push_subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

create policy push_subscriptions_delete_own
on public.push_subscriptions for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.push_subscriptions from public, anon, authenticated;
grant select, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

-- The endpoint identifies a browser, not an account. Signing in with another account on
-- the same browser moves the subscription to the new owner, which plain RLS upserts
-- cannot do. The device timezone is saved so reminders fire at the local due time.
create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null,
  p_timezone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_user_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 512))
  on conflict (endpoint) do update
  set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent;

  if p_timezone is not null
    and exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    insert into public.user_preferences (user_id, timezone)
    values (v_user_id, p_timezone)
    on conflict (user_id) do update set timezone = excluded.timezone;
  end if;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text, text)
  from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text, text)
  to authenticated;

-- Moment of the occurrence that was last reminded. Comparing it with the current due
-- moment makes rescheduled and recurring tasks remind again without extra triggers.
alter table public.tasks
  add column if not exists reminder_sent_for timestamptz;

create index if not exists tasks_pending_reminders_idx
on public.tasks (due_date)
where due_time is not null and deleted_at is null;

-- Atomically marks and returns the tasks due in the last p_grace window, so overlapping
-- cron runs never send the same reminder twice. Older tasks are skipped on purpose.
create or replace function public.claim_due_task_reminders(
  p_grace interval default interval '15 minutes'
)
returns table (task_id uuid, user_id uuid, title text, due_time time)
language sql
set search_path = ''
as $$
  with due as (
    select
      t.id,
      (t.due_date + t.due_time) at time zone coalesce(p.timezone, 'America/Sao_Paulo')
        as due_at
    from public.tasks t
    left join public.user_preferences p on p.user_id = t.user_id
    where t.due_time is not null
      and t.deleted_at is null
      and t.status <> 'completed'::public.task_status
      and t.due_date between current_date - 1 and current_date + 1
      and exists (
        select 1 from public.push_subscriptions s where s.user_id = t.user_id
      )
  )
  update public.tasks t
  set reminder_sent_for = due.due_at
  from due
  where t.id = due.id
    and due.due_at <= now()
    and due.due_at > now() - p_grace
    and t.reminder_sent_for is distinct from due.due_at
  returning t.id, t.user_id, t.title, t.due_time;
$$;

revoke all on function public.claim_due_task_reminders(interval)
  from public, anon, authenticated;
grant execute on function public.claim_due_task_reminders(interval) to service_role;

-- Runs every minute and stays a no-op until both Vault secrets exist.
select cron.schedule(
  'flowy-task-reminders',
  '* * * * *',
  $job$
  select net.http_post(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'flowy_reminders_url'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'flowy_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  )
  where exists (
    select 1 from vault.decrypted_secrets where name = 'flowy_reminders_url'
  )
  and exists (
    select 1 from vault.decrypted_secrets where name = 'flowy_cron_secret'
  );
  $job$
);

comment on column public.tasks.reminder_sent_for is
  'Due moment of the occurrence whose push reminder was already sent.';

notify pgrst, 'reload schema';
