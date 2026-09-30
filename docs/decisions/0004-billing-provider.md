# ADR 0004 — Provider inicial de billing

- Data: 2026-09-30
- Status: aceito para implementação, sujeito à validação comercial

## Fontes oficiais

- [Stripe Billing subscriptions](https://docs.stripe.com/billing/subscriptions/overview), consultada em 2026-09-30.
- [Stripe global availability](https://stripe.com/global), consultada em 2026-09-30.
- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests), consultada em 2026-09-30.

## Decisão

- `BILLING_PROVIDER=stripe` como primeira implementação.
- Provider encapsulado por interface própria; domínio usa planos, entitlements, assinatura e UsageRecord, não objetos Stripe.
- Webhooks são persistidos e deduplicados por event ID.
- Requisições mutáveis usam idempotency key, além da idempotência local.
- Preços, moeda, impostos e planos são configuração, nunca enums com valores monetários hardcoded.
- Antes do lançamento, validar entidade jurídica, país da conta, moedas, impostos e disponibilidade contratual no Brasil e Canadá.

## Alternativas rejeitadas

- Integrar vários gateways no MVP.
- Tratar mensalidade como mensageria Meta ilimitada.
- Usar polling como fonte primária do estado da assinatura.

## Consequências

Stripe acelera subscriptions e webhooks, mas o contrato do domínio permite outro provider sem duplicar regras de entitlement e usage.
