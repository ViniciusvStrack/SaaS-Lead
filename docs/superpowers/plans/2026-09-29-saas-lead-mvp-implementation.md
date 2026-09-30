# SaaS Lead MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um SaaS horizontal em produção que conecte oficialmente empresas ao WhatsApp, transforme conversas em oportunidades, exija aprovação humana para follow-ups e acompanhe respostas e resultados com segurança.

**Architecture:** Monorepo TypeScript com Next.js, NestJS e worker BullMQ sobre PostgreSQL/Prisma e Redis. O sistema usa monólito modular, inbox/outbox idempotentes, isolamento explícito por organização e providers encapsulados para Meta, OpenAI e billing.

**Tech Stack:** pnpm, Turborepo, TypeScript, Next.js, React, Tailwind CSS, shadcn/ui, NestJS, PostgreSQL, Prisma, Redis, BullMQ, Zod, OpenAI Responses API, Meta WhatsApp Cloud API e Stripe a confirmar.

**Spec:** `docs/superpowers/specs/2026-09-29-saas-lead-mvp-design.md`

## Global Constraints

- Produto horizontal: nenhum módulo de domínio pode depender de um segmento específico.
- Somente WhatsApp Business Platform/Cloud API oficial; proibir automação de WhatsApp Web.
- IA produz sinais e sugestões; regras e Policy Engine autorizam ações.
- Aprovação humana é obrigatória para todo envio de follow-up no MVP.
- Toda entidade de negócio e operação assíncrona deve preservar `organizationId`.
- Webhooks, jobs, oportunidades, envios e billing devem ser idempotentes.
- Conteúdo de clientes é dado não confiável, nunca instrução de sistema.
- Logs não devem conter secrets nem conteúdo integral de conversas por padrão.
- Valores de planos, preços, modelos e versões externas não podem ser hardcoded no domínio.
- Cada tarefa segue TDD, termina com verificação completa e commit pequeno.
- Antes de implementar comportamento de Meta, OpenAI ou billing, registrar fonte oficial e data em ADR.
- Dependências devem ser pinadas pelo lockfile; não adicionar infraestrutura sem uso no MVP.

## Review Focus

- Webhook duplicado ou fora de ordem deve produzir uma mensagem e nenhuma ação duplicada; coberto nas Tarefas 6 e 7.
- Um usuário ou job do tenant A nunca pode ler ou alterar recursos do tenant B; coberto nas Tarefas 4, 5 e 7.
- Mensagem editada depois da aprovação deve invalidar a decisão anterior; coberto na Tarefa 10.
- Saída de IA inválida, recusada ou manipulada por prompt injection deve falhar de forma segura; coberto na Tarefa 8.
- Retry após timeout de Meta ou billing não pode duplicar envio, assinatura ou cobrança; coberto nas Tarefas 10 e 12.

---

## Mapa de arquivos e responsabilidades

```text
apps/web/                         interface autenticada, onboarding e dashboard
apps/api/                         HTTP, auth, webhooks e casos de uso síncronos
apps/worker/                      consumidores BullMQ e tarefas agendadas
packages/database/                Prisma schema, client, migrations e testes DB
packages/contracts/               enums, DTOs, eventos e schemas Zod compartilhados
packages/config/                  ambiente tipado e feature flags
packages/observability/           logger, correlação e métricas
packages/ai/                      AIProvider, schemas e OpenAIProvider
packages/whatsapp/                WhatsAppProvider e MetaCloudProvider
packages/policy/                  regras puras e versionadas de envio
packages/ui/                      componentes compartilhados do web
docs/decisions/                   ADRs com fontes oficiais e consequências
docs/runbooks/                    operação, incidentes, backup e recuperação
infra/docker/                     recursos locais e configuração de containers
```

Planos detalhados por fase serão salvos no mesmo diretório antes da execução da respectiva fase. Este plano mestre fixa interfaces, dependências, gates e ordem; os planos de fase não podem ampliar o escopo sem revisão da especificação.

### Task 1: Discovery oficial e prova do caminho crítico

**Files:**
- Create: `docs/decisions/0001-meta-onboarding-and-coexistence.md`
- Create: `docs/decisions/0002-meta-messaging-policy.md`
- Create: `docs/decisions/0003-openai-data-and-structured-outputs.md`
- Create: `docs/decisions/0004-billing-provider.md`
- Create: `docs/discovery/provider-capability-matrix.md`
- Create: `spikes/meta-smoke/README.md`
- Create: `spikes/meta-smoke/src/webhook.ts`
- Test: `spikes/meta-smoke/test/webhook.test.ts`

**Interfaces:**
- Consumes: contas de desenvolvimento dos providers e a especificação aprovada.
- Produces: decisões `META_ONBOARDING_MODE`, `META_GRAPH_API_VERSION`, `BILLING_PROVIDER`; contrato documentado dos webhooks; prova descartável de challenge, assinatura e evento de teste.

- [ ] **Step 1: Registrar fontes oficiais e perguntas verificáveis**

Cada ADR deve registrar URL oficial, data da consulta, decisão, alternativas e consequência. Não usar blog ou repositório comunitário como fonte normativa.

- [ ] **Step 2: Escrever testes falhos da prova de webhook**

Criar `verifiesChallenge(query, expectedToken): string` e `verifySignature(rawBody, signature, appSecret): boolean`. Testar token correto/incorreto, body alterado e assinatura ausente.

- [ ] **Step 3: Executar o teste e confirmar falha**

Run: `pnpm --dir spikes/meta-smoke test`
Expected: FAIL porque as funções ainda não existem.

- [ ] **Step 4: Implementar somente a prova mínima**

O spike não entra em produção. Ele deve provar challenge, assinatura, payload real de teste e resposta rápida, sem banco nem IA.

- [ ] **Step 5: Executar a prova e preencher a matriz**

Run: `pnpm --dir spikes/meta-smoke test`
Expected: PASS. A matriz deve conter decisões explícitas para todos os itens que bloqueiam Tasks 6, 8, 10 e 12.

- [ ] **Step 6: Commit**

Run: `git add docs/decisions docs/discovery spikes/meta-smoke && git commit -m "docs: validate provider capabilities"`

### Task 2: Fundação do monorepo e ambiente local

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`
- Create: `tsconfig.base.json`, `.editorconfig`, `.gitignore`, `.env.example`
- Create: `apps/web/**`, `apps/api/**`, `apps/worker/**`
- Create: `packages/{database,contracts,config,observability}/**`
- Create: `compose.yaml`, `infra/docker/**`
- Create: `.github/workflows/ci.yml`, `README.md`, `CONTRIBUTING.md`
- Test: `apps/api/test/health.e2e-spec.ts`, `apps/worker/test/bootstrap.spec.ts`

**Interfaces:**
- Consumes: decisões da Task 1.
- Produces: scripts raiz `dev`, `build`, `lint`, `typecheck`, `test`; `GET /health`; `GET /ready`; processos web/api/worker inicializáveis.

- [ ] **Step 1: Criar plano detalhado da fase Foundation**

Salvar em `docs/superpowers/plans/2026-09-29-foundation.md`, fixando versões, scripts e arquivos exatos após consultar releases oficiais.

- [ ] **Step 2: Escrever testes falhos de health e bootstrap**

`GET /health` retorna 200 sem dependências; `GET /ready` retorna 503 quando PostgreSQL ou Redis não responde; worker recusa iniciar com configuração inválida.

- [ ] **Step 3: Executar testes e confirmar falha**

Run: `pnpm test`
Expected: FAIL porque workspace e aplicações ainda não existem.

- [ ] **Step 4: Criar o menor workspace que satisfaz os testes**

O root coordena comandos; cada app possui responsabilidade única; Docker Compose expõe PostgreSQL e Redis com health checks.

- [ ] **Step 5: Verificar ambiente reproduzível**

Run: `pnpm install --frozen-lockfile && docker compose config && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: todos os comandos terminam com exit code 0.

- [ ] **Step 6: Commit**

Run: `git add . && git commit -m "chore: establish monorepo foundation"`

### Task 3: Configuração, observabilidade e contratos base

**Files:**
- Create: `packages/config/src/env.schema.ts`
- Create: `packages/config/src/load-config.ts`
- Create: `packages/observability/src/logger.ts`
- Create: `packages/observability/src/correlation.ts`
- Create: `packages/contracts/src/common/ids.ts`
- Modify: `apps/api/src/main.ts`, `apps/worker/src/main.ts`
- Test: `packages/config/test/load-config.spec.ts`
- Test: `packages/observability/test/correlation.spec.ts`

**Interfaces:**
- Consumes: `process.env` e request/job metadata.
- Produces: `loadConfig(env): AppConfig`, `createLogger(context): Logger`, `withCorrelation(input): CorrelationContext`.

- [ ] **Step 1: Escrever testes falhos**

Testar variável obrigatória ausente, segredo redigido, `requestId` preservado e geração quando ausente.

- [ ] **Step 2: Confirmar falha**

Run: `pnpm --filter @saas-lead/config test && pnpm --filter @saas-lead/observability test`
Expected: FAIL por módulos ausentes.

- [ ] **Step 3: Implementar interfaces mínimas**

Configuração deve falhar cedo; logger aceita metadados estruturados e redige chaves configuradas.

- [ ] **Step 4: Verificar**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add packages apps && git commit -m "feat: add typed config and observability"`

### Task 4: Banco, tenancy e auditoria

**Files:**
- Create: `packages/database/prisma/schema.prisma`
- Create: `packages/database/src/client.ts`
- Create: `packages/database/src/tenant-context.ts`
- Create: `apps/api/src/modules/organizations/**`
- Create: `apps/api/src/modules/audit/**`
- Test: `apps/api/test/tenant-isolation.e2e-spec.ts`
- Test: `apps/api/test/audit.e2e-spec.ts`

**Interfaces:**
- Consumes: `UserId`, `OrganizationId`, `RequestContext` da Task 3.
- Produces: `TenantContext { organizationId, userId, role }`; `OrganizationRepository`; `AuditService.record(event): Promise<void>`.

- [ ] **Step 1: Escrever testes falhos de isolamento**

Criar dois tenants; provar que leitura, update e tentativa de inferência cruzada retornam not found/forbidden sem revelar existência.

- [ ] **Step 2: Confirmar falha**

Run: `pnpm --filter api test:e2e -- tenant-isolation audit`
Expected: FAIL por schema e módulos ausentes.

- [ ] **Step 3: Implementar schema mínimo e migration**

Modelar `User`, `Organization`, `OrganizationMember`, `BusinessSettings` e `AuditLog`, com constraints da especificação.

- [ ] **Step 4: Implementar TenantContext obrigatório**

Repositories não expõem métodos de negócio sem `TenantContext`; `organizationId` do body nunca substitui o tenant da sessão.

- [ ] **Step 5: Verificar migration e testes**

Run: `pnpm db:migrate:test && pnpm --filter api test:e2e`
Expected: PASS, incluindo isolamento entre dois tenants.

- [ ] **Step 6: Commit**

Run: `git add packages/database apps/api && git commit -m "feat: establish tenant-isolated core"`

### Task 5: Autenticação, sessão e RBAC

**Files:**
- Create: `apps/api/src/modules/auth/**`
- Create: `apps/api/src/modules/memberships/**`
- Create: `apps/web/src/app/(auth)/**`
- Create: `apps/web/src/lib/session.ts`
- Test: `apps/api/test/auth-rbac.e2e-spec.ts`
- Test: `apps/web/src/lib/session.test.ts`

**Interfaces:**
- Consumes: `TenantContext` e repositories da Task 4.
- Produces: cookie HTTP-only; `requireSession()`; `authorize(action, resource, context): AuthorizationDecision`.

- [ ] **Step 1: Criar plano detalhado de Auth/SaaS Core**

Fixar provider de identidade, lifecycle de convite e matriz OWNER/ADMIN/AGENT sem adicionar SSO ao MVP.

- [ ] **Step 2: Escrever testes falhos**

Cobrir sessão ausente/expirada, convite expirado/reutilizado, permissões por papel e acesso cruzado entre tenants.

- [ ] **Step 3: Confirmar falha**

Run: `pnpm --filter api test:e2e -- auth-rbac && pnpm --filter web test`
Expected: FAIL.

- [ ] **Step 4: Implementar fluxo mínimo**

Autorização ocorre por ação/recurso; tokens e credenciais nunca são retornados ao frontend.

- [ ] **Step 5: Verificar**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add apps packages && git commit -m "feat: add authentication and tenant RBAC"`

### Task 6: Conexão Meta e inbox de webhooks

**Files:**
- Create: `packages/whatsapp/src/whatsapp-provider.ts`
- Create: `packages/whatsapp/src/meta-cloud-provider.ts`
- Create: `apps/api/src/modules/whatsapp/**`
- Create: `apps/api/src/modules/webhooks/**`
- Modify: `packages/database/prisma/schema.prisma`
- Test: `apps/api/test/meta-webhook.e2e-spec.ts`
- Test: `packages/whatsapp/test/meta-cloud-provider.contract.spec.ts`

**Interfaces:**
- Consumes: ADRs Meta da Task 1, `TenantContext`, config e logger.
- Produces: `WhatsAppProvider.connect()`, `send()`, `getTemplates()`; `WebhookInbox.accept(rawRequest): AcceptResult`.

- [ ] **Step 1: Criar plano detalhado da integração Meta**

Copiar para o plano os campos e regras confirmados nas fontes oficiais, incluindo assinatura, versão e onboarding.

- [ ] **Step 2: Escrever testes falhos**

Cobrir challenge, assinatura inválida, payload grande/malformado, evento duplicado e número não associado a tenant.

- [ ] **Step 3: Confirmar falha**

Run: `pnpm --filter api test:e2e -- meta-webhook && pnpm --filter @saas-lead/whatsapp test`
Expected: FAIL.

- [ ] **Step 4: Implementar conexão e inbox mínimos**

Persistir `WhatsAppAccount`, `WhatsAppNumber` e `WebhookEvent`; responder 2xx somente após persistência/deduplicação segura.

- [ ] **Step 5: Verificar contratos**

Run: `pnpm test && pnpm typecheck`
Expected: PASS; duas entregas do mesmo evento resultam em uma linha processável.

- [ ] **Step 6: Commit**

Run: `git add apps/api packages && git commit -m "feat: ingest official Meta webhooks"`

### Task 7: Worker, conversas e processamento idempotente

**Files:**
- Create: `apps/worker/src/queues/**`
- Create: `apps/worker/src/processors/normalize-inbound.processor.ts`
- Create: `apps/api/src/modules/{contacts,conversations,messages}/**`
- Modify: `packages/database/prisma/schema.prisma`
- Create: `packages/contracts/src/events/inbound-message.ts`
- Test: `apps/worker/test/normalize-inbound.integration.spec.ts`

**Interfaces:**
- Consumes: `WebhookEventId`, `OrganizationId` e inbox da Task 6.
- Produces: `InboundMessageEvent`; `ConversationSnapshot`; filas `webhook.normalize` e dead-letter auditável.

- [ ] **Step 1: Escrever testes falhos**

Cobrir duplicação, evento fora de ordem, retry após falha parcial, tenant incorreto e contato concorrente.

- [ ] **Step 2: Confirmar falha**

Run: `pnpm --filter worker test -- normalize-inbound`
Expected: FAIL.

- [ ] **Step 3: Implementar fila e normalização**

Usar job IDs determinísticos, transação por evento e upserts com constraints compostas.

- [ ] **Step 4: Verificar recuperação**

Run: `pnpm --filter worker test && pnpm --filter api test:e2e`
Expected: PASS; retries não duplicam `Message` nem cruzam tenants.

- [ ] **Step 5: Commit**

Run: `git add apps packages && git commit -m "feat: process inbound conversations asynchronously"`

### Task 8: Análise estruturada e controle de custo de IA

**Files:**
- Create: `packages/ai/src/ai-provider.ts`
- Create: `packages/ai/src/openai-provider.ts`
- Create: `packages/ai/src/schemas/conversation-analysis.ts`
- Create: `apps/worker/src/processors/analyze-conversation.processor.ts`
- Create: `apps/api/src/modules/ai-analysis/**`
- Modify: `packages/database/prisma/schema.prisma`
- Test: `packages/ai/test/openai-provider.contract.spec.ts`
- Test: `apps/worker/test/analyze-conversation.integration.spec.ts`
- Create: `evals/conversation-analysis/**`

**Interfaces:**
- Consumes: `ConversationSnapshot`, `BusinessSettings` e prompt versionado.
- Produces: `AIProvider.analyzeConversation(input): Promise<ConversationAnalysis>`; `AIAnalysis`; `UsageRecord` de tokens/custo.

- [ ] **Step 1: Criar plano detalhado da fase IA**

Fixar schema estruturado, política de retenção, modelos configuráveis, limites e dataset inicial horizontal.

- [ ] **Step 2: Escrever testes falhos**

Cobrir saída válida, schema inválido, recusa, timeout, conteúdo adversarial, cache por hash e ausência de desconto permitido.

- [ ] **Step 3: Confirmar falha**

Run: `pnpm --filter @saas-lead/ai test && pnpm --filter worker test -- analyze-conversation`
Expected: FAIL.

- [ ] **Step 4: Implementar provider e resumo incremental**

Usar Structured Outputs e validação Zod; chamadas reais ficam atrás de adapter testável e feature flag.

- [ ] **Step 5: Executar testes e evals**

Run: `pnpm test && pnpm eval:conversation-analysis`
Expected: testes PASS; relatório de eval gerado com casos e falhas explícitas, sem meta de precisão inventada.

- [ ] **Step 6: Commit**

Run: `git add packages apps evals && git commit -m "feat: add structured conversation analysis"`

### Task 9: Opportunity Engine e dashboard inicial

**Files:**
- Create: `apps/api/src/modules/opportunities/**`
- Create: `apps/worker/src/processors/detect-opportunity.processor.ts`
- Create: `packages/contracts/src/opportunities/**`
- Create: `apps/web/src/app/(dashboard)/opportunities/**`
- Modify: `packages/database/prisma/schema.prisma`
- Test: `apps/api/test/opportunity-engine.integration.spec.ts`
- Test: `apps/web/src/app/(dashboard)/opportunities/page.test.tsx`

**Interfaces:**
- Consumes: `ConversationAnalysis`, estado, tempo e `BusinessSettings`.
- Produces: `OpportunityEngine.detect(input): OpportunityCandidate[]`; `Opportunity`, `OpportunityEvent`; consultas paginadas por tenant.

- [ ] **Step 1: Escrever testes falhos**

Cobrir `QUOTE_ABANDONED`, `LEAD_GHOSTED`, `COMPANY_NO_RESPONSE`, ausência de valor, duplicação e explicação baseada em evidência.

- [ ] **Step 2: Confirmar falha**

Run: `pnpm --filter api test:e2e -- opportunity-engine && pnpm --filter web test`
Expected: FAIL.

- [ ] **Step 3: Implementar regras determinísticas mínimas**

IA fornece sinais; regras versionadas decidem tipo/prioridade. Não produzir probabilidade de fechamento.

- [ ] **Step 4: Implementar dashboard comercial mínimo**

Exibir contagem, valor conhecido e motivos; não exibir receita recuperada sem conversão atribuída.

- [ ] **Step 5: Verificar**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add apps packages && git commit -m "feat: detect and present commercial opportunities"`

### Task 10: Sugestão, Policy Engine, aprovação e envio

**Files:**
- Create: `packages/policy/src/policy-engine.ts`
- Create: `packages/policy/src/rules/**`
- Create: `apps/api/src/modules/outbound/**`
- Create: `apps/worker/src/processors/{generate-suggestion,send-message,reconcile-message}.processor.ts`
- Create: `apps/web/src/app/(dashboard)/opportunities/[id]/**`
- Modify: `packages/database/prisma/schema.prisma`
- Test: `packages/policy/test/policy-engine.spec.ts`
- Test: `apps/api/test/outbound-approval.e2e-spec.ts`
- Test: `apps/worker/test/send-message.integration.spec.ts`

**Interfaces:**
- Consumes: Opportunity, templates sincronizados, ConsentRecord, conta Meta e sugestão da Task 8.
- Produces: `PolicyEngine.evaluate(input): PolicyDecision`; `OutboundMessage`; filas `suggestion.generate`, `message.send`, `message.reconcile`.

- [ ] **Step 1: Criar plano detalhado de Policy/Outbound**

Traduzir regras oficiais confirmadas para decisões versionadas e motivos estáveis.

- [ ] **Step 2: Escrever testes falhos do Policy Engine**

Cobrir opt-out, consentimento ausente, janela fechada, template necessário/não aprovado, cooldown, conta inativa e permissão insuficiente.

- [ ] **Step 3: Escrever testes falhos de aprovação/idempotência**

Cobrir conteúdo editado após aprovação, duplo clique, timeout do provider e webhook de status duplicado.

- [ ] **Step 4: Confirmar falha**

Run: `pnpm --filter @saas-lead/policy test && pnpm --filter api test:e2e -- outbound && pnpm --filter worker test -- send-message`
Expected: FAIL.

- [ ] **Step 5: Implementar bloqueio por padrão e outbox**

Condição desconhecida resulta em `BLOCKED`; worker revalida condições temporais antes do envio.

- [ ] **Step 6: Verificar ciclo completo com provider fake**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: PASS; nenhuma chamada ao provider ocorre sem aprovação válida e decisão `APPROVED` atual.

- [ ] **Step 7: Commit**

Run: `git add apps packages && git commit -m "feat: approve and send policy-compliant follow-ups"`

### Task 11: Onboarding e configurações horizontais

**Files:**
- Create: `apps/web/src/app/(onboarding)/**`
- Create: `apps/web/src/app/(dashboard)/settings/**`
- Create: `apps/api/src/modules/business-settings/**`
- Create: `packages/contracts/src/business-settings/**`
- Test: `apps/api/test/business-settings.e2e-spec.ts`
- Test: `apps/web/src/app/(onboarding)/onboarding.test.tsx`

**Interfaces:**
- Consumes: Auth/RBAC da Task 5 e conexão Meta da Task 6.
- Produces: `BusinessSettings` versionado; onboarding state machine; contexto permitido para IA e Policy.

- [ ] **Step 1: Escrever testes falhos**

Cobrir retomada do onboarding, configuração vazia, `allowDiscounts=false`, horários/timezone e acesso por papel.

- [ ] **Step 2: Confirmar falha**

Run: `pnpm --filter api test:e2e -- business-settings && pnpm --filter web test`
Expected: FAIL.

- [ ] **Step 3: Implementar formulários e API mínimos**

Usar campos universais e metadata controlada; não criar schema builder nem campos por nicho.

- [ ] **Step 4: Verificar**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add apps packages && git commit -m "feat: add horizontal business onboarding"`

### Task 12: Billing, entitlements e uso por organização

**Files:**
- Create: `apps/api/src/modules/subscriptions/**`
- Create: `apps/api/src/modules/usage/**`
- Create: `packages/contracts/src/billing/**`
- Create: `apps/web/src/app/(dashboard)/billing/**`
- Modify: `packages/database/prisma/schema.prisma`
- Test: `apps/api/test/billing-webhook.e2e-spec.ts`
- Test: `apps/api/test/entitlements.e2e-spec.ts`

**Interfaces:**
- Consumes: ADR de billing e `OrganizationId`.
- Produces: `BillingProvider`; `EntitlementService.can(action, usage): Decision`; `UsageRecorder.record(input)`; estado local de assinatura.

- [ ] **Step 1: Criar plano detalhado de billing**

Fixar provider, moeda, trial, eventos e responsabilidade pelos custos da Meta sem hardcode de preços no domínio.

- [ ] **Step 2: Escrever testes falhos**

Cobrir webhook duplicado/fora de ordem, assinatura cancelada, trial expirado, limite excedido e retry de criação com idempotency key.

- [ ] **Step 3: Confirmar falha**

Run: `pnpm --filter api test:e2e -- billing entitlements`
Expected: FAIL.

- [ ] **Step 4: Implementar provider, ledger de uso e limites**

UsageRecord é imutável e rastreável à origem; webhooks são fonte do estado reconciliado.

- [ ] **Step 5: Verificar**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: PASS; retries não criam duas assinaturas ou dois registros da mesma origem.

- [ ] **Step 6: Commit**

Run: `git add apps packages && git commit -m "feat: add subscriptions and tenant usage"`

### Task 13: Analytics, LGPD e operação

**Files:**
- Create: `apps/api/src/modules/analytics/**`
- Create: `apps/api/src/modules/privacy/**`
- Create: `apps/worker/src/processors/retention.processor.ts`
- Create: `apps/web/src/app/(dashboard)/activity/**`
- Create: `docs/runbooks/{webhook-failure,queue-backlog,provider-outage,backup-restore}.md`
- Test: `apps/api/test/analytics-attribution.e2e-spec.ts`
- Test: `apps/api/test/privacy-lifecycle.e2e-spec.ts`

**Interfaces:**
- Consumes: OpportunityEvents, mensagens, OutboundMessages, UsageRecords e AuditLogs.
- Produces: métricas comerciais atribuíveis; exportação/exclusão auditada; retenção configurada; runbooks.

- [ ] **Step 1: Escrever testes falhos**

Cobrir receita sem evidência, conversão atribuída, exportação isolada por tenant, exclusão com retenção legal e logs sem conteúdo sensível.

- [ ] **Step 2: Confirmar falha**

Run: `pnpm --filter api test:e2e -- analytics-attribution privacy-lifecycle`
Expected: FAIL.

- [ ] **Step 3: Implementar métricas e lifecycle mínimos**

Valores não atribuíveis permanecem separados; exclusão é job auditado e idempotente.

- [ ] **Step 4: Executar exercício operacional**

Seguir os quatro runbooks em ambiente de staging e registrar evidências/ajustes no próprio documento.

- [ ] **Step 5: Verificar**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add apps docs packages && git commit -m "feat: add trustworthy analytics and privacy lifecycle"`

### Task 14: Staging, segurança e beta controlado

**Files:**
- Create: `infra/deploy/**`
- Create: `docs/runbooks/deploy.md`
- Create: `docs/runbooks/security-checklist.md`
- Create: `docs/beta/onboarding-checklist.md`
- Create: `docs/beta/feedback-log-template.md`
- Modify: `.github/workflows/ci.yml`
- Test: `tests/system/critical-cycle.spec.ts`

**Interfaces:**
- Consumes: todos os módulos e providers.
- Produces: ambiente staging reproduzível; deploy versionado; smoke test do ciclo crítico; processo de beta para 3–5 empresas de segmentos diversos.

- [ ] **Step 1: Criar plano detalhado de deploy/hardening**

Escolher infraestrutura simples com banco/Redis gerenciados, secrets manager, domínio, TLS, backups e rollback.

- [ ] **Step 2: Escrever teste sistêmico falho**

O teste percorre organização → conexão fake/ambiente de teste → webhook → conversa → análise fake → oportunidade → sugestão → política → aprovação → envio fake → resposta → resultado.

- [ ] **Step 3: Confirmar falha**

Run: `pnpm test:system -- critical-cycle`
Expected: FAIL antes da configuração de staging.

- [ ] **Step 4: Configurar staging e CI/CD**

Deploy exige migrations seguras, health checks e rollback; produção permanece bloqueada até os gates seguintes.

- [ ] **Step 5: Executar gates de lançamento**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:system`
Expected: PASS. Também exigir restore de backup, teste de isolamento, revisão de secrets, alertas e smoke test Meta real.

- [ ] **Step 6: Conduzir beta e registrar resultados**

Onboardar 3–5 empresas de segmentos diversos com aprovação humana obrigatória; registrar falsos positivos, custo por tenant, falhas e feedback sem ampliar o escopo durante o teste.

- [ ] **Step 7: Gate de produção**

Liberar produção somente após critérios legais, operacionais, segurança e confiabilidade serem assinados no checklist. Itens falhos geram tarefas corretivas antes do lançamento.

- [ ] **Step 8: Commit**

Run: `git add infra docs .github tests && git commit -m "chore: prepare controlled beta and production launch"`

## Gates globais de conclusão

- O ciclo crítico funciona com Meta real em ambiente controlado.
- Isolamento entre tenants possui testes negativos em API, worker, cache e exports.
- Reentrega de webhooks e retries não duplicam mensagens, oportunidades, envios ou billing.
- Policy Engine bloqueia por padrão e toda decisão é auditável.
- IA inválida/indisponível degrada sem enviar mensagens.
- Custos de IA, Meta e infraestrutura podem ser atribuídos por organização.
- Backup e restauração foram executados, não apenas documentados.
- Alertas detectam indisponibilidade de webhook, backlog, worker parado e falha de provider.
- LGPD possui retenção, exportação e exclusão operacionais.
- Dashboard não apresenta ROI ou receita sem atribuição verificável.
- Beta com segmentos diversos confirma que configurações horizontais são suficientes.
- Deploy de produção possui rollback, responsáveis e runbooks.

## Estratégia de execução e economia de contexto

1. Executar uma task por vez e carregar somente o plano da fase, a seção relevante da spec e os arquivos afetados.
2. Atualizar o Graphify apenas após cada fase concluída, usando modo incremental.
3. Manter ADRs curtos para impedir rediscussão de decisões já confirmadas.
4. Usar providers fake em testes e chamadas reais apenas em smoke tests explicitamente controlados.
5. Revisar cada task antes da seguinte; não acumular grandes diffs.
6. Criar planos detalhados “just in time”, sem antecipar arquivos de fases distantes que ainda podem mudar após o beta.
