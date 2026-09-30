# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um monorepo reproduzível em que web, API e worker compilam, são testáveis e expõem sinais básicos de saúde.

**Architecture:** pnpm/Turborepo coordena três apps e quatro pacotes base. A API NestJS separa liveness de readiness; o worker valida ambiente antes do bootstrap; PostgreSQL e Redis são dependências locais via Docker Compose.

**Tech Stack:** Node 24, pnpm 11.22.0, TypeScript 5.9.3, Turbo 2.11.5, Next 16.3.7, React 19.3.0, NestJS 12.1.2, Prisma 7.10.0, BullMQ 6.3.10, ioredis 6.0.0, Zod 4.6.5 e Vitest 5.0.3.

**Spec:** `docs/superpowers/specs/2026-09-29-saas-lead-mvp-design.md`

## Decisões

- Fixar Prisma CLI e client em 7.10.0; `prisma@latest` apontava para 8.0.0-rc.19 em 2026-09-30.
- Usar Node testado na máquina (24.14.0) e declarar `>=24 <25`.
- Não conectar banco/Redis nos testes unitários; readiness recebe probes reais via injeção e testa comportamento com fakes determinísticos.
- Não criar domínio, auth ou filas nesta fase.

## Arquivos

- Root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.editorconfig`, `.env.example`, `compose.yaml`.
- API: `apps/api/src/{main,app.module,health.controller,readiness.service}.ts` e `apps/api/test/health.e2e-spec.ts`.
- Worker: `apps/worker/src/{main,worker-env}.ts` e `apps/worker/test/bootstrap.spec.ts`.
- Web: `apps/web/src/app/{layout,page}.tsx`.
- Packages: `packages/{database,contracts,config,observability}` com manifest e entrypoint.
- Operação: `.github/workflows/ci.yml`, `README.md`, `CONTRIBUTING.md`.

## Interfaces fixadas

- `DependencyProbe = () => Promise<boolean>`.
- `ReadinessService(databaseProbe, redisProbe).check(): Promise<{ ready: boolean; dependencies: { database: boolean; redis: boolean } }>`.
- `validateWorkerEnv(env): { databaseUrl: string; redisUrl: string }`, rejeitando valores ausentes/vazios.
- `GET /health` retorna `{ status: "ok" }` e HTTP 200 sem consultar dependências.
- `GET /ready` retorna HTTP 200 quando ambos probes passam e 503 caso contrário.

## Ciclo TDD

- [ ] Escrever os testes de health/readiness e worker bootstrap antes dos módulos.
- [ ] Executar `corepack pnpm test` e observar falha por imports ausentes.
- [ ] Implementar os módulos mínimos e manifests.
- [ ] Executar testes focados até ficarem verdes.
- [ ] Executar `corepack pnpm install --frozen-lockfile`, `docker compose config`, lint, typecheck, testes e build.
- [ ] Commitar como `chore: establish monorepo foundation`.

## Aceite

- Clone limpo instala pelo lockfile.
- Web, API e worker compilam pelo Turbo.
- Health não depende de infraestrutura; readiness diferencia falhas.
- Worker não inicia sem `DATABASE_URL` e `REDIS_URL`.
- Compose define health checks para PostgreSQL e Redis.
- CI executa lint, typecheck, testes e build.
- Nenhum secret real é versionado.
