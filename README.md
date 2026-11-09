# SaaS Lead

SaaS horizontal de inteligência comercial e recuperação de oportunidades via WhatsApp Business Platform oficial.

## Requisitos

- Node.js 24
- Corepack com pnpm 11.22.0
- Docker com Compose v2

Antes de instalar as dependências, use Node.js `24.12.0` conforme os arquivos `.nvmrc` e `.node-version`. Depois habilite o Corepack e confirme `pnpm --version` como `11.22.0`.

## Configuração local

```powershell
corepack enable
pnpm install --frozen-lockfile
Copy-Item .env.example .env
docker compose up -d
pnpm dev
```

Aplicações: web em `3000`, API em `3001` e worker como processo separado. `GET /health` verifica liveness; `GET /ready` verifica dependências.

## Verificação

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Nunca versione `.env`, tokens da Meta, chaves da OpenAI ou secrets de billing.

## Estado

O projeto está em implementação por fases. Consulte `docs/superpowers/specs` e `docs/superpowers/plans` antes de alterar arquitetura ou escopo.
