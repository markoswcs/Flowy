-- Somente leitura: por que cada pessoa recebe (ou não) lembretes.
with subs as (
  select user_id, count(*) as aparelhos,
    string_agg(distinct case
      when user_agent ilike '%iphone%' or user_agent ilike '%ipad%' then 'iOS'
      when user_agent ilike '%android%' then 'Android'
      when user_agent ilike '%windows%' then 'Windows'
      when user_agent ilike '%mac%' then 'Mac'
      else 'outro' end, ',') as tipos,
    string_agg(distinct replace(coalesce(origin, '?'), 'https://', ''), ',') as enderecos,
    max(created_at)::date as ativou_em
  from public.push_subscriptions group by user_id
),
t as (
  select user_id,
    count(*) filter (where created_at > now() - interval '14 days') as criadas_14d,
    count(*) filter (where created_at > now() - interval '14 days' and due_time is not null) as com_hora_14d,
    count(*) filter (where created_at > now() - interval '14 days' and due_date is not null and due_time is null) as so_data_14d,
    count(*) filter (where status <> 'completed' and deleted_at is null and due_time is not null and due_date >= current_date - 1) as abertas_com_hora,
    count(*) filter (where reminder_sent_for > now() - interval '14 days') as lembretes_14d,
    max(reminder_sent_for) as ultimo_lembrete
  from public.tasks group by user_id
)
select
  coalesce(nullif(pr.display_name, ''), split_part(u.email, '@', 1)) as nome,
  u.created_at::date as conta,
  u.last_sign_in_at::date as ultimo_login,
  coalesce(s.aparelhos, 0) as aparelhos, s.tipos, s.enderecos, s.ativou_em,
  p.timezone,
  coalesce(t.criadas_14d, 0) as criadas_14d, coalesce(t.com_hora_14d, 0) as com_hora_14d,
  coalesce(t.so_data_14d, 0) as so_data_14d, coalesce(t.abertas_com_hora, 0) as abertas_com_hora,
  coalesce(t.lembretes_14d, 0) as lembretes_14d, t.ultimo_lembrete,
  case
    when s.aparelhos is null then 'SEM APARELHO: nunca ativou (ou a inscrição expirou)'
    when coalesce(t.criadas_14d, 0) = 0 then 'parado: não criou tarefa em 14 dias'
    when coalesce(t.com_hora_14d, 0) = 0 then 'SEM HORÁRIO: cria tarefas só com data ou sem data'
    when coalesce(t.lembretes_14d, 0) = 0 then 'INVESTIGAR: tem aparelho e horário mas nenhum lembrete saiu'
    else 'ok'
  end as diagnostico
from auth.users u
left join public.profiles pr on pr.user_id = u.id
left join public.user_preferences p on p.user_id = u.id
left join subs s on s.user_id = u.id
left join t on t.user_id = u.id
order by u.last_sign_in_at desc nulls last;
