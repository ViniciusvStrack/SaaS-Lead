# Web Outbound Aprovação — conectar dashboard ao fluxo de envio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar o botão "Aprovar e enviar" no detalhe da oportunidade, conectando o dashboard ao endpoint `POST /outbound/approvals` já existente na API (commit 5c9c194), para que o usuário possa aprovar o conteúdo da sugestão e disparar o envio via Meta diretamente do painel.

**Architecture:** (1) Endpoint proxy Next.js `apps/web/src/app/api/outbound/approve/route.ts` recebe `conversationId`, `content`, `idempotencyKey`, `opportunityId`, `suggestionId` e repassa para `API_BASE_URL/outbound/approvals` com o cookie `saas_lead_session` do cliente; (2) Tela de detalhe `apps/web/src/app/(dashboard)/opportunities/[id]/page.tsx` exibe botão "Aprovar e enviar" quando há sugestão, chama o proxy e mostra feedback de sucesso/erro; (3) Tipo `OpportunityItem` em `apps/web/src/lib/opportunities.ts` recebe `conversationId` e `suggestionId` (campo reservado pelo Codex — aguardar liberação/adição).

**Tech Stack:** Next.js App Router (web), fetch para proxy, vitest + testing-library para testes de unidade do web, TypeScript strict.

**Spec:** `docs/superpowers/plans/2026-09-30-policy-outbound.md` (regras de aprovação) + endpoint `POST /outbound/approvals` já implementado em `apps/api/src/modules/outbound/outbound.controller.ts`.

## Global Constraints

- `apps/web/src/lib/opportunities.ts` está reservado pelo Codex (BILLING-UI-002 reserva `apps/web/src/lib/**`). A adição de `conversationId` e `suggestionId` a `OpportunityItem` requer confirmação do Codex; não editar esse arquivo sem liberação.
- Não tocar em `organizations/**`, `audit/**`, `subscriptions/**`, `webhooks/**`, `outbound/**` da API (reservados/liberados pelo Codex ou já meus mas completos).
- Node >=24 <25; pnpm 11.22.0; testes de DB não rodam localmente (sem Postgres/Redis).
- TDD: nenhum código de produção sem teste falhando primeiro.
- Commit + push apenas na própria branch `feat/worker-openai-provider`.
- Endpoint de webhook da Meta responde sempre 200 (não afeta esta tarefa).

## Review Focus

1. **Botão apenas com sugestão**: "Aprovar e enviar" aparece somente quando `result.item.suggestion` existe; desabilitado/ausente caso contrário.
2. **Conteúdo da sugestão**: o corpo enviado na aprovação é `result.item.suggestion.content` (texto efetivo, com `editedContent` se houver).
3. **Idempotência**: `idempotencyKey` gerado como `approve-{opportunityId}-{suggestionId}` para evitar duplicação em cliques rápidos.
4. **Feedback de erro**: se a API retornar 401/400/500, mostrar mensagem ao usuário sem expor credenciais.
5. **Tenant isolation**: o proxy envia o cookie de sessão; a API valida sessão e RBAC (`message.approve`).

## Task Structure

### Task 1: Adicionar conversationId e suggestionId a OpportunityItem (Codec)

**Files:**
- Modify: `apps/web/src/lib/opportunities.ts` (reservado pelo Codex — aguardar confirmação)

**Interfaces:**
- Consumes: nada.
- Produces: `OpportunityItem.conversationId: string`, `OpportunityItem.suggestionId?: string`.

- [ ] **Step 1: Confirmar com Codex** se pode editar `apps/web/src/lib/opportunities.ts`.
- [ ] **Step 2: Adicionar campos** `conversationId` e `suggestionId` ao tipo `OpportunityItem`.
- [ ] **Step 3: Commit** apenas este arquivo.

### Task 2: Endpoint proxy Next.js para aprovação outbound

**Files:**
- Criar: `apps/web/src/app/api/outbound/approve/route.ts`
- Criar: `apps/web/src/app/api/outbound/approve/route.test.ts`

**Interfaces:**
- Consumes: `Request` com body `{ conversationId, content, idempotencyKey?, opportunityId?, suggestionId? }` e cookie `saas_lead_session`.
- Produz: repassa para `${API_BASE_URL}/outbound/approvals` com cookie encaminhado; retorna status e body da API.

- [ ] **Step 1: Write failing test** — proxy encaminha body + cookie para a API; retorna status da API; trata 401/500.
- [ ] **Step 2: Run test to verify it fails**.
- [ ] **Step 3: Implement `route.ts`** — ler cookies, forward para API_BASE_URL/outbound/approvals.
- [ ] **Step 4: Run test to verify it passes**.
- [ ] **Step 5: Web typecheck** (`pnpm --filter @saas-lead/web typecheck`) + lint.
- [ ] **Step 6: Commit**.

### Task 3: Botão "Aprovar e enviar" no detalhe da oportunidade

**Files:**
- Modify: `apps/web/src/app/(dashboard)/opportunities/[id]/page.tsx`
- Criar/Modify: `apps/web/src/app/(dashboard)/opportunities/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `OpportunityItem` (com `suggestion` e `suggestionId` e `conversationId`).
- Produz: botão "Aprovar e enviar" visível quando há sugestão; chama `POST /api/outbound/approve`; exibe feedback de sucesso/erro/carregamento.

- [ ] **Step 1: Write failing test** — botão aparece com sugestão; clique chama proxy com content da sugestão; feedback de sucesso; desabilitado sem sugestão.
- [ ] **Step 2: Run test to verify it fails**.
- [ ] **Step 3: Implement** — adicionar estado de carregamento, handler de submit, feedback.
- [ ] **Step 4: Run test to verify it passes**.
- [ ] **Step 5: Web typecheck + lint**.
- [ ] **Step 6: Commit**.

### Task 4: Verificação final e documentação

**Files:**
- Modify: `docs/superpowers/plans/2026-11-09-web-outbound-approve.md` (marcar completo)

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produz: typecheck + lint limpos no web; testes unitários passando; commit + push.

- [ ] **Step 1: web typecheck** — `pnpm --filter @saas-lead/web typecheck`.
- [ ] **Step 2: web lint** — `pnpm --filter @saas-lead/web lint`.
- [ ] **Step 3: web testes** — `pnpm --filter @saas-lead/web test`.
- [ ] **Step 4: Commit final + push** — `git commit` e `git push origin feat/worker-openai-provider`.

## Self-Review

1. **Spec coverage:** O plano cobre proxy, tela, feedback e tipos. Não cobre tela de listagem de aprovações pendentes (próxima fatia).
2. **Step scan:** Cada passo tem exatamente uma ação verificável. Nenhuma linha "TBD".
3. **Type consistency:** `OpportunityItem` precisa de `conversationId` e `suggestionId` — depende da Task 1 (Codec).
4. **Review Focus:** Cada um dos 5 itens tem teste alocado em Task 2 ou 3.
5. **Proportion:** 4 tasks com 5-6 steps cada — proporcional à integração UI+API.

**Plan complete and saved to `docs/superpowers/plans/2026-11-09-web-outbound-approve.md`.**

Aguardo confirmação do Codex sobre Task 1 (editar `apps/web/src/lib/opportunities.ts`). Enquanto isso, posso iniciar Task 2 (endpoint proxy) que não depende do tipo — o body é aceito como `unknown` e validado no proxy.

Deseja que prossiga com Task 2 agora (endereço proxy) enquanto aguarda o Codex?
