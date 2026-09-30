# ADR 0003 — OpenAI, dados e Structured Outputs

- Data: 2026-09-30
- Status: aceito

## Fontes oficiais

- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), consultada em 2026-09-30.
- [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses), consultada em 2026-09-30.

## Decisão

- Usar Responses API por trás de `AIProvider`.
- Usar Structured Outputs com `text.format`, `type=json_schema`, `strict=true` e `additionalProperties=false`.
- Gerar schema a partir de Zod/helper oficial para evitar divergência de tipos.
- Modelo é configurado por ambiente; não fica hardcoded no domínio.
- Tratar recusa, resposta incompleta, timeout e erro de schema como falhas seguras.
- Conteúdo do cliente é delimitado como dado não confiável.
- Enviar apenas resumo e mensagens necessárias; registrar tokens/custo por organização.

## Alternativas rejeitadas

- JSON livre ou JSON mode como contrato principal: não garante aderência ao schema.
- Chamadas diretas ao SDK espalhadas pelos módulos.
- Histórico integral em toda análise.

## Consequências

Structured Outputs garante forma, não verdade semântica. Zod, regras determinísticas, evals e aprovação humana continuam obrigatórios.
