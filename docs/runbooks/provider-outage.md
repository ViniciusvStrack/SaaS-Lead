# Indisponibilidade de provedor

## Objetivo e gatilho

Impedir perda ou envio duplicado durante indisponibilidade da Meta ou de IA. Acione com timeout sustentado, aumento de 5xx ou status oficial degradado.

## Resposta

1. Separe o impacto por capacidade: receber, enviar, analisar ou gerar sugestão.
2. Preserve mensagens aprovadas como pendentes; não marque como enviadas sem `externalMessageId`.
3. Abra circuito para a capacidade degradada, aplique espera exponencial com jitter e respeite limites do provedor.
4. Mantenha ações manuais disponíveis e mostre estado degradado na interface.
5. Na recuperação, libere gradualmente, reconcilie webhooks e confirme que cada chave idempotente gerou no máximo um envio.

## Comunicação

Atualize status a cada 30 minutos com impacto e alternativa, sem prometer prazo do terceiro. Encerre após 30 minutos de estabilidade e reconciliação completa.

## Exercício

Tabletop local em 2026-10-01: timeout preservando mensagem aprovada validado por `send-message.integration.spec.ts`. Failover real aguarda staging.
