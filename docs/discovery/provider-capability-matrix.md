# Matriz de capacidades dos providers

Atualizada em 2026-09-30. Fontes normativas ficam nos ADRs correspondentes.

| Área | Decisão do MVP | Gate antes de produção | Fallback seguro |
|---|---|---|---|
| Onboarding Meta | `embedded_signup` | completar fluxo com conta de teste | bloquear conexão e orientar suporte |
| Coexistência | desativada por padrão | provar elegibilidade e eventos | operar somente com Cloud API suportada |
| Histórico anterior | não utilizado | nenhum | começar base com eventos pós-conexão |
| Graph API | variável obrigatória e pinada | confirmar versão no dashboard | aplicação não inicia sem versão |
| Webhook Meta | challenge + assinatura vigente + inbox | payload/evento real de teste | rejeitar/bloquear processamento |
| Templates/janela | Policy Engine versionado | confirmar regras e template real | `BLOCKED` |
| OpenAI | Responses + Structured Outputs | schema/evals e controles de dados | registrar falha, não criar ação |
| Billing | Stripe | conta, país, moeda, impostos e webhooks | trial/manual controlado sem cobrança |
| APIs públicas | somente enriquecimento | licença/SLA/limites por API | onboarding manual continua disponível |

## Variáveis bloqueadoras

- `META_ONBOARDING_MODE=embedded_signup`
- `META_COEXISTENCE_ENABLED=false`
- `META_GRAPH_API_VERSION=<versão aprovada no dashboard>`
- `BILLING_PROVIDER=stripe`

Tasks 6, 8, 10 e 12 só podem substituir esses valores por nova decisão registrada em ADR.
