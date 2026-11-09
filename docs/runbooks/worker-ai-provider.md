# Worker — providers de IA (análise e sugestão)

O worker escolhe os providers de análise e de sugestão no startup, em
`apps/worker/src/ai-provider.config.ts`, com a mesma configuração de ambiente.

## Comportamento

| Configuração | Análise | Sugestão |
|---|---|---|
| Nada definido | `RuleBasedAnalysisProvider` | `RuleBasedSuggestionProvider` |
| `OPENAI_API_KEY` definido | `OpenAIProvider` (Structured Outputs) | `OpenAISuggestionProvider` |
| `AI_PROVIDER=rules` | Regras, mesmo com chave presente | Regras, mesmo com chave presente |
| `AI_PROVIDER=openai` | OpenAI; falha no startup se faltar chave ou modelo | idem |

Ambos usam o mesmo `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS` e `OPENAI_BASE_URL`.

Configuração inválida **falha no startup**. O worker não degrada silenciosamente
para regras: um job com provider indisponível falha e é reprocessado pela fila,
sem gerar oportunidade nem envio.

## Variáveis

| Variável | Obrigatória | Padrão | Observação |
|---|---|---|---|
| `AI_PROVIDER` | não | derivado | `rules` ou `openai` |
| `OPENAI_API_KEY` | em `openai` | — | nunca é logada |
| `OPENAI_MODEL` | em `openai` | — | escolher o modelo nas fontes oficiais (ADR-0003) |
| `OPENAI_TIMEOUT_MS` | não | `30000` | inteiro positivo |
| `AI_PROMPT_VERSION` | não | `conversation-analysis.v1` | entra no hash de cache |
| `OPENAI_BASE_URL` | não | `https://api.openai.com/v1` | útil para proxy/ambiente de teste |

## Fluxo de sugestão

Depois que `opportunity.detect` grava uma oportunidade, o worker monta a sugestão
de próxima ação com `PrismaSuggestionRuntime` e persiste em `AISuggestion`
(status `DRAFT`). A operação é idempotente por oportunidade + análise: um job
reentregue reutiliza a sugestão existente e não chama o provider de novo.

O texto sugerido nunca é enviado automaticamente — ele é só um rascunho para
revisão/aprovação humana (Policy Engine + outbound).

## Cache e custo

`AIAnalysis`, `AISuggestion` e `UsageRecord` usam `inputHash` + `promptVersion` +
`model` + provider. Trocar modelo, provider ou versão de prompt invalida o cache
e cria novos registros de uso — o custo fica atribuído por organização
(`sourceType = "AISuggestion"`).

## Validação

```powershell
pnpm --filter @saas-lead/worker test -- ai-provider
pnpm --filter @saas-lead/worker typecheck
```
