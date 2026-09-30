# Fase IA — plano detalhado

- Responses API, Structured Outputs via `text.format`, schema estrito e `store: false`.
- Modelo configurável por ambiente; nenhum fallback silencioso.
- Feature flag desligada sem credencial e sem dataset/evals aprovados.
- Zod valida novamente todo resultado; recusa, timeout, incompletude e schema inválido não criam ação comercial.
- Prompt versionado e hash de `snapshot + settings + prompt + model` para cache e auditoria.
- Retenção: persistir análise, hashes, modelo, prompt e uso; não persistir raciocínio interno nem resposta bruta além da janela operacional de diagnóstico.
- Limites iniciais: timeout configurável, teto de tokens de saída e orçamento por organização; preço não fica hardcoded no provider.
- Dataset horizontal inicial cobre compra, suporte, objeção, conteúdo adversarial, silêncio e pedido de desconto.
- Política comercial é autoridade: ausência de desconto permitido sempre produz `discountAllowed=false` e percentual nulo.
