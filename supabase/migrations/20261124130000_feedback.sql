-- Feedback: anyone signed in sends bugs, ideas and other notes; each person
-- sees their own; the Flowy admins (app_admins) see all and set the status.

create table if not exists public.feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'idea',
  message text not null,
  page text,
  app_version text,
  -- Filled by the database from the account, never from the request.
  author_name text,
  author_email text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint feedback_kind check (kind in ('bug', 'idea', 'other')),
  constraint feedback_status check (status in ('new', 'seen', 'done')),
  constraint feedback_message check (char_length(btrim(message)) between 3 and 2000),
  constraint feedback_page check (page is null or char_length(page) <= 200),
  constraint feedback_version check (app_version is null or char_length(app_version) <= 40)
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id, created_at desc);

alter table public.feedback enable row level security;

-- Who wrote it comes from the account; at most 10 messages an hour per person.
create or replace function public.feedback_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.status := 'new';
  new.created_at := now();
  if (
    select count(*) from public.feedback f
    where f.user_id = new.user_id and f.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Muitos envios seguidos. Tente de novo mais tarde.' using errcode = 'P0001';
  end if;
  select u.email into new.author_email from auth.users u where u.id = new.user_id;
  select p.display_name into new.author_name from public.profiles p where p.user_id = new.user_id;
  return new;
end;
$$;
revoke execute on function public.feedback_before_insert() from public, anon, authenticated;

drop trigger if exists feedback_before_insert on public.feedback;
create trigger feedback_before_insert
  before insert on public.feedback
  for each row execute function public.feedback_before_insert();

drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists feedback_read on public.feedback;
create policy feedback_read on public.feedback
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_app_admin()));

drop policy if exists feedback_admin_update on public.feedback;
create policy feedback_admin_update on public.feedback
  for update to authenticated using ((select public.is_app_admin())) with check ((select public.is_app_admin()));

drop policy if exists feedback_admin_delete on public.feedback;
create policy feedback_admin_delete on public.feedback
  for delete to authenticated using ((select public.is_app_admin()));

-- Admins may only change the status, not rewrite what people sent.
revoke update on public.feedback from authenticated;
grant update (status) on public.feedback to authenticated;

notify pgrst, 'reload schema';
