# Segurança

## Como reportar uma vulnerabilidade

Não abra uma issue pública. Use **Security → Report a vulnerability** neste
repositório (GitHub Private Vulnerability Reporting). Respondemos em até 7 dias.

## Práticas do projeto

- Segredos ficam apenas nas variáveis de ambiente da Vercel e no Vault do
  Supabase. Nunca use prefixo `NEXT_PUBLIC_` em chaves privadas
  (`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`).
- Todas as tabelas usam RLS forçada (`auth.uid() = user_id`).
- A rota de cron exige `Authorization: Bearer CRON_SECRET` comparado em tempo
  constante.
- Cabeçalhos de segurança (CSP de framing, HSTS, nosniff, Permissions-Policy)
  são definidos em `next.config.ts`.
- Dependabot e CI (lint, tipos, testes e `npm audit`) rodam em cada push.
