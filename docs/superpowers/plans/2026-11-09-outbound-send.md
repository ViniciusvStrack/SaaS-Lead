# Outbound persistente — aprovação e envio

## Objetivo

Fechar o elo que falta entre a sugestão de próxima ação e a mensagem real no WhatsApp:
aprovar no servidor, persistir a decisão do Policy Engine, enfileirar `message.send`, recarregar
o contexto no worker, reavaliar a política e só então chamar a Meta.

## Regras

- O cliente nunca envia o contexto da política. `consentimento`, `janela`, `template`,
  `cooldown`, `conta ativa` e `permissão` são derivados no servidor a partir do banco.
- Fora da janela de 24h (sem inbound recente), só passa com `MessageTemplate.status = APPROVED`.
- Cooldown é opt-in: só bloqueia se `BusinessSettings.commercialPolicies.outboundCooldownSeconds`
  for numérico e houver envio recente na mesma conversa.
- Consentimento: último `ConsentRecord` do contato. `REVOKED` bloqueia (`OPTED_OUT` + `CONSENT_REQUIRED`);
  ausência bloqueia (`CONSENT_REQUIRED` + `CONTEXT_UNKNOWN`).
- Aprovação é idempotente por `(organizationId, idempotencyKey)`. Reaprovar republica o job
  determinístico (recupera enqueue que falhou) sem duplicar.
- No worker, `APPROVED → SENDING` é uma transição atômica (`updateMany`); job duplicado não envia duas vezes.
- Falha/timeout do provider volta para `APPROVED` e o BullMQ tenta de novo. Timeout não vira sucesso.
- Conteúdo divergente do hash aprovado bloqueia (`CONTENT_CHANGED`). Decisão persistida diferente
  de `APPROVED` bloqueia sem chamar a Meta.

## Fatias

### Fatia 1 — Domínio + persistência + endpoint

Arquivos:
- `apps/api/src/modules/outbound/outbound-approval.service.ts` (interfaces, in-memory, idempotência)
- `apps/api/src/modules/outbound/approval-context.ts` (derivação pura)
- `apps/api/src/modules/outbound/prisma-outbound.store.ts`
- `apps/api/src/modules/outbound/prisma-approval-context.reader.ts`
- `apps/api/src/modules/outbound/outbound.controller.ts`
- `apps/api/src/modules/outbound/outbound.module.ts`
- `apps/api/src/app.module.ts`

Testes:
- `apps/api/test/outbound-approval.e2e-spec.ts`: clique duplo publica uma vez; bloqueio não publica;
  contexto do cliente é ignorado quando o reader é usado.
- `apps/api/test/approval-context.spec.ts`: consentimento, opt-out, janela, template, cooldown, conta.
- `apps/api/test/outbound-input.spec.ts`: validação do body e mapeamento de erro.

### Fatia 2 — Fila `message.send`

Arquivos:
- `apps/api/src/modules/outbound/outbound-send.publisher.ts`

Teste:
- `apps/api/test/outbound-send.publisher.spec.ts`: jobId determinístico, nome da fila, prefixo e retries.

### Fatia 3 — Runtime do worker

Arquivos:
- `apps/worker/src/processors/prisma-send.runtime.ts`
- `apps/worker/src/processors/meta-send.provider.ts`
- `apps/worker/src/worker-handlers.ts`
- `apps/worker/src/main.ts`
- `apps/worker/package.json` (+ `@saas-lead/whatsapp`)

Testes:
- `apps/worker/test/prisma-send.runtime.spec.ts` (fake store): conflito, política, transição atômica,
  sucesso, timeout, job duplicado.
- `apps/worker/test/meta-send.provider.spec.ts`: resolve credencial sem vazar token.
- `apps/worker/test/worker-runtime.spec.ts`: handler `message.send` valida payload.

### Fatia 4 — Documentação e verificação

- `docs/runbooks/outbound.md`
- `.env.example` (`META_ACCESS_TOKEN`)
- `pnpm typecheck`, `pnpm lint`, testes direcionados, `git diff --check`.

## Fora de escopo

- Reconciliação de status de entrega (`message.reconcile`) — OUTBOUND-002.
- Botão de aprovação no dashboard — próxima fatia de UI.
- Templates reais da Meta e janela por categoria — depende de validação no dashboard.
