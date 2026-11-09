# Worker — provider de análise de IA

O worker escolhe o provider de análise no startup, em
`apps/worker/src/ai-provider.config.ts`.

## Comportamento

| Configuração | Provider efetivo |
|---|---|
| Nada definido | `RuleBasedAnalysisProvider` (determinístico, sem custo) |
| `OPENAI_API_KEY` definido | `OpenAIProvider` (Responses API, Structured Outputs) |
| `AI_PROVIDER=rules` | Regras, mesmo com chave presente |
| `AI_PROVIDER=openai` | OpenAI; falha no startup se faltar chave ou modelo |

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

## Cache e custo

`AIAnalysis` e `UsageRecord` usam `inputHash` + `promptVersion` + `model` + provider.
Trocar modelo, provider ou versão de prompt invalida o cache e cria novos registros
de uso — o custo fica atribuído por organização.

## Validação

```powershell
pnpm --filter @saas-lead/worker test -- ai-provider
pnpm --filter @saas-lead/worker typecheck
```
