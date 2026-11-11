-- WhatsApp: people send a message to the Flowy number and it becomes a task.
-- An account is tied to a WhatsApp number by a short code: the app shows it
-- (start_whatsapp_link) and the person sends it from their phone. Only the
-- server (service role, in /api/whatsapp) reads numbers and creates tasks.
create table if not exists public.whatsapp_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- WhatsApp id of the number (country + area code + number, digits only).
  phone text unique,
  code text unique,
  code_expires_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint whatsapp_links_phone check (phone is null or phone ~ '^[0-9]{8,15}$'),
  constraint whatsapp_links_code check (code is null or code ~ '^[0-9]{6}$')
);

alter table public.whatsapp_links enable row level security;

drop policy if exists whatsapp_links_select_own on public.whatsapp_links;
create policy whatsapp_links_select_own on public.whatsapp_links
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists whatsapp_links_delete_own on public.whatsapp_links;
create policy whatsapp_links_delete_own on public.whatsapp_links
  for delete to authenticated using (user_id = (select auth.uid()));

-- A new code for the signed-in person, valid for 15 minutes. A number already
-- tied to the account stays until the code is used from another number.
create or replace function public.start_whatsapp_link()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.whatsapp_links where code = v_code);
  end loop;
  insert into public.whatsapp_links (user_id, code, code_expires_at)
  values (v_user, v_code, now() + interval '15 minutes')
  on conflict (user_id) do update
    set code = excluded.code, code_expires_at = excluded.code_expires_at;
  return v_code;
end;
$$;

revoke all on function public.start_whatsapp_link() from public, anon;
grant execute on function public.start_whatsapp_link() to authenticated;

-- Messages already handled: WhatsApp may deliver the same one twice.
create table if not exists public.whatsapp_messages (
  id text primary key,
  created_at timestamptz not null default now()
);

alter table public.whatsapp_messages enable row level security;
