# Regras do projeto

- Inspecionar o repositório antes de propor grandes mudanças.
- Preferir o estilo existente em vez de novas abstrações.
- Manter as mudanças limitadas ao pedido.
- Declarar suposições quando algo for ambíguo.
- Após editar, executar o teste mais relevante possível ou explicar por que não foi executado.
- Não tratar uma construção bem-sucedida como prova se o comportamento arriscado não foi exercido.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
