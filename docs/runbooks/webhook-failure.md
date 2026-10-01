# Falha no webhook

## Objetivo e gatilho

Recuperar a ingestão sem duplicar mensagens. Acione quando a taxa de erro superar 2% por 10 minutos, a fila de rejeitados crescer ou o provedor sinalizar falha.

## Resposta

1. Registre incidente, horário, organizações afetadas e responsável.
2. Verifique saúde da API, assinatura do webhook, latência do banco e erros por `externalId`; nunca copie payload ou credencial para o ticket.
3. Se a assinatura falhar, bloqueie o processamento e valide o segredo no cofre. Se a dependência falhar, preserve os eventos na caixa de entrada.
4. Reprocesse pela chave idempotente somente após recuperar a dependência.
5. Confirme: fila drenando, nenhum `externalId` duplicado, contagens de entrada e normalização reconciliadas.
6. Comunique clientes afetados e registre causa, duração, impacto e prevenção.

## Escalonamento e evidência

Escalone ao plantonista em 10 minutos e ao provedor em 20 minutos sem recuperação. Anexe apenas IDs, métricas agregadas, timestamps e comandos executados.

## Exercício

Tabletop local em 2026-10-01: cenário de evento duplicado e falha parcial coberto por `webhook-normalize.integration.spec.ts`. Exercício real em staging fica condicionado ao provisionamento da etapa de entrega.
