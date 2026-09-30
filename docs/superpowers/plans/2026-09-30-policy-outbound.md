# Policy e Outbound — plano detalhado

## Objetivo

Nenhuma mensagem comercial sai sem aprovação humana válida e decisão atual do Policy Engine. Qualquer dado ausente ou condição desconhecida bloqueia o envio.

## Contratos e regras

- `PolicyEngine.evaluate(input)` é puro, versionado e retorna `APPROVED` ou `BLOCKED` com motivos estáveis.
- A aprovação salva o hash SHA-256 do conteúdo exato e uma chave idempotente por organização.
- `message.send` recarrega o contexto, compara o hash aprovado, reavalia condições temporais e só então chama o provider.
- O provider recebe a chave idempotente local; timeout não é convertido em sucesso.
- `message.reconcile` aceita cada transição externa uma única vez.
- Bloqueios: `OPTED_OUT`, `CONSENT_REQUIRED`, `APPROVED_TEMPLATE_REQUIRED`, `COOLDOWN_ACTIVE`, `ACCOUNT_INACTIVE`, `INSUFFICIENT_PERMISSION`, `CONTENT_CHANGED` e `CONTEXT_UNKNOWN`.

Fora da janela, um template aprovado e consentimento válido são obrigatórios. Opt-out, conta inativa, cooldown e permissão insuficiente sempre bloqueiam.

## Persistência e estados

`ConsentRecord`, `MessageTemplate`, `AISuggestion`, `PolicyDecision`, `OutboundMessage` e `OutboundMessageEvent` são isolados por `organizationId`. Estado inicial aprovado: `APPROVED`; envio: `SENDING` → `SENT`; reconciliação: `DELIVERED`, `READ` ou `FAILED`. Unicidade por `(organizationId, idempotencyKey)` e `(organizationId, externalEventId)`.

## Verificação

Testes cobrem regras bloqueantes, edição depois da aprovação, clique duplo, timeout, revalidação e webhook duplicado. Suíte completa, tipos, lint, schema e build encerram a etapa.
