-- Each subscription remembers the address (origin) it was made on. A phone that
-- subscribed on the old address and again on the current one got every reminder
-- twice; now subscribing on one address removes that same browser's subscription
-- from the other address (same account and user agent, different origin).
-- Subscriptions on the same address are never touched: two computers with the
-- same browser keep both.
alter table public.push_subscriptions
  add column if not exists origin text;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_origin_length,
  add constraint push_subscriptions_origin_length
    check (origin is null or char_length(origin) <= 255);

-- The old five-argument version is replaced (keeping both would make calls
-- ambiguous). Clients that do not send p_origin still work.
drop function if exists public.register_push_subscription(text, text, text, text, text);

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null,
  p_timezone text default null,
  p_origin text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_agent text := left(p_user_agent, 512);
  v_origin text := left(p_origin, 255);
begin
  if v_user_id is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, origin)
  values (v_user_id, p_endpoint, p_p256dh, p_auth, v_user_agent, v_origin)
  on conflict (endpoint) do update
  set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    origin = coalesce(excluded.origin, public.push_subscriptions.origin);

  if v_origin is not null and v_user_agent is not null then
    delete from public.push_subscriptions s
    where s.user_id = v_user_id
      and s.endpoint <> p_endpoint
      and s.user_agent = v_user_agent
      and s.origin is distinct from v_origin;
  end if;

  if p_timezone is not null
    and exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    insert into public.user_preferences (user_id, timezone)
    values (v_user_id, p_timezone)
    on conflict (user_id) do update set timezone = excluded.timezone;
  end if;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
