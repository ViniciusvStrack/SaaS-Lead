# Quality Gate

O workflow `Quality Gate` executa uma validação rápida em pull requests sem
precisar de secrets, banco de dados, Redis ou qualquer serviço externo.

Ele executa os comandos já definidos no monorepo:

```text
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm --filter @saas-lead/config --filter @saas-lead/ai \
  --filter @saas-lead/policy --filter @saas-lead/whatsapp \
  --filter @saas-lead/observability test
```

O gate é complementar ao workflow `CI`: a validação completa continua sendo
responsável por lint, build, migrações e testes que exigem PostgreSQL ou Redis.
O job fornece apenas uma `DATABASE_URL` local fictícia porque a configuração do
Prisma exige uma URL sintaticamente válida durante o typecheck; nenhuma conexão
é aberta e nenhuma credencial deve ser adicionada a este workflow.
