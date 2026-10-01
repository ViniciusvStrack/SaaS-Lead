# Billing, entitlements e uso — plano detalhado

## Decisões

- O primeiro adapter é Stripe, conforme ADR 0004; o domínio depende somente de `BillingProvider`.
- Preços, moedas, impostos, trials e limites vêm da configuração do plano. Nenhum valor monetário fica hardcoded.
- Custos da Meta são medidos separadamente e não são presumidos como incluídos na mensalidade.
- Webhooks validados são a fonte de verdade do estado reconciliado da assinatura.
- Criação de assinatura, eventos e registros de uso têm chaves idempotentes.

## Estados e ordenação

Assinaturas usam `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELED` e `INCOMPLETE`. Um evento só altera o estado quando seu instante de criação é posterior ao último evento aplicado. Duplicatas são aceitas sem repetir efeitos.

## Entitlements

`EntitlementService.can(action, usage)` exige assinatura ativa ou trial vigente e compara o uso atual ao limite configurado. Ausência de entitlement bloqueia. O ledger de uso é imutável e rastreável por organização, métrica, tipo e ID de origem.

## Segurança operacional

Somente Owner gerencia billing no MVP. A UI exibe configuração demonstrativa sem iniciar cobrança real até a conta, moeda e impostos serem validados comercialmente.
