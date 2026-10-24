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
- Varredura de segredos (gitleaks) em todo o histórico e CodeQL
  (`security-extended`) rodam em cada push e PR.
- Ao excluir a conta, o avatar e as imagens de diagramas do usuário são
  apagados do Storage antes do usuário.
- O service worker guarda no aparelho uma cópia das páginas de `/app` para
  abrir na hora; a sessão continua sendo conferida pelo servidor em cada
  abertura. As cópias (e as listas salvas no `localStorage`) são apagadas ao
  sair, ao excluir a conta, ao abrir `/login` e quando o servidor manda para
  o login.

## Checklist do repositório no GitHub

Estas opções só podem ser ligadas pelo dono em **Settings**:

1. **Code security** → ativar _Secret scanning_, _Push protection_,
   _Dependabot alerts_, _Dependabot security updates_ e _Private
   vulnerability reporting_.
2. **Branches** → regra para `main`: exigir PR, exigir os checks `check`,
   `secrets` e `analyze`, bloquear force-push e exclusão, exigir revisão dos
   CODEOWNERS.
3. **Actions → General** → _Workflow permissions_: "Read repository contents";
   desmarcar "Allow GitHub Actions to create and approve pull requests".
4. **Conta** → autenticação em dois fatores (2FA) com chave de acesso ou app.
5. Se algum segredo já vazou: gire a chave no painel do serviço (Supabase,
   VAPID, CRON_SECRET) primeiro; apagar do histórico não basta.

## Dependências com alerta conhecido

Os alertas restantes do `npm audit` vêm de dependências internas do
Excalidraw/Mermaid que rodam no navegador (sem acesso a dados de outros
usuários) e ainda não têm versão corrigida compatível. `lodash-es` e `nanoid`
3.x já são forçados para versões corrigidas via `overrides`.
