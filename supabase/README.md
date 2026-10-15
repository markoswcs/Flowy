# Banco de dados do Flowy

O schema é aplicado por quatro migrations, nesta ordem:

1. `20260918180000_core_schema.sql`: entidades, relações, índices e triggers.
2. `20260918180100_security_and_api.sql`: RLS, grants, Realtime e RPCs atômicos.
3. `20260918180200_trash_retention.sql`: limpeza segura da lixeira com `pg_cron`.
4. `20260918180300_avatar_storage.sql`: bucket de avatars e policies de Storage.

## Modelo

- `profiles` e `user_preferences`: uma linha por usuário do Supabase Auth.
- `folders`, `categories`, `tasks`, `notes`: organização pessoal e soft delete.
- `task_categories` e `note_categories`: relações N:N com categorias.
- `boards`, `board_columns`, `board_cards`: Kanban ordenável. `board_cards.board_id` acelera a leitura e uma FK composta garante que card e coluna pertençam ao mesmo quadro. Um card pode apontar para uma tarefa por `task_id`; nesse caso, um trigger mantém `title` nulo e a UI usa o título da tarefa como fonte de verdade.
- `board_columns.semantic_status`: quando preenchido, mover um card ligado a uma tarefa sincroniza o status da tarefa.

Os campos `position` são `numeric(20,6)`: a interface pode usar posições espaçadas ou fracionárias no drag-and-drop e normalizá-las quando necessário. `notes.content` guarda o JSON do editor; `notes.plain_text` deve ser atualizado junto no autosave para pesquisa rápida.

## Segurança

Todas as tabelas privadas têm RLS habilitada e forçada. As policies exigem `auth.uid() = user_id`. Relações usam chaves compostas `(id, user_id)`, impedindo que um usuário vincule seus dados a registros de outra conta. `anon` não recebe privilégios nas tabelas.

As funções de trigger e de purge não são executáveis por usuários do navegador. As RPCs disponíveis para `authenticated` são `create_board_with_defaults`, `move_board_card`, `reorder_board_columns` e `global_search`; elas são `SECURITY INVOKER`, validam a sessão e continuam sujeitas a RLS.

Nunca coloque `service_role` ou secrets em variáveis `NEXT_PUBLIC_*`. O navegador deve receber somente a URL e a chave pública/publishable do projeto. Operações administrativas devem ficar em ambiente server-side seguro. Para a exclusão definitiva de conta, defina `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente do servidor (por exemplo, nas variáveis de ambiente da Vercel).

O bucket público `avatars` aceita JPEG, PNG, WebP e AVIF até 2 MB. O cliente deve gravar exatamente em `{auth.uid()}/avatar`; isso limita cada conta a um objeto nesse bucket. Apenas o dono pode inserir, substituir, listar os metadados ou remover seu objeto. A entrega por URL pública é intencional, pois avatar não é tratado como dado privado.

## Lixeira e retenção

Itens com `deleted_at` continuam no banco e podem ser restaurados atribuindo `NULL`. O job `flowy-purge-trash-daily` roda diariamente no backend e chama `purge_deleted_items()`. A função impõe retenção mínima de sete dias, mesmo se chamada com intervalo menor.

## Lembretes por notificação push

A migration `20261015130000_add_task_push_reminders.sql` cria `push_subscriptions` (um registro por navegador/dispositivo), a coluna `tasks.reminder_sent_for` e o job `flowy-task-reminders`, que roda a cada minuto via `pg_cron` + `pg_net` e chama `POST /api/cron/reminders` no app. A rota usa `claim_due_task_reminders()` para marcar de forma atômica as tarefas com horário vencido nos últimos 15 minutos e envia o Web Push. O horário é interpretado no fuso salvo em `user_preferences.timezone`, atualizado quando o usuário ativa as notificações.

O job não faz nada enquanto os dois secrets abaixo não existirem no Vault. Depois de aplicar a migration, rode uma vez no SQL Editor do Supabase, usando a URL de produção e o mesmo valor de `CRON_SECRET` configurado na Vercel:

```sql
select vault.create_secret('https://SEU-DOMINIO/api/cron/reminders', 'flowy_reminders_url');
select vault.create_secret('VALOR_DO_CRON_SECRET', 'flowy_cron_secret');
```

Variáveis de ambiente do servidor (Vercel): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET` e `SUPABASE_SERVICE_ROLE_KEY`. `VAPID_SUBJECT` é opcional (padrão: `NEXT_PUBLIC_SITE_URL`). Gere um novo par VAPID com `npx web-push generate-vapid-keys`; trocar o par invalida as inscrições existentes. No iPhone, o push só funciona com o Flowy instalado na tela de início (iOS 16.4+).

## Aplicação

Vincule o CLI ao projeto informado e aplique as migrations:

```bash
supabase link --project-ref pkspziqmejpcdrvrkrep
supabase db push
```

Depois, gere novamente os tipos TypeScript a partir do banco para manter o frontend alinhado. A vinculação local do CLI e tokens de acesso não devem ser versionados.

No Supabase Auth do ambiente de produção, configure a URL canônica do site e permita explicitamente os callbacks `/auth/callback` e `/auth/reset`. Mantenha `NEXT_PUBLIC_SITE_URL` definido em produção; não use um wildcard amplo de redirects.
