# Acúmulo de fila

## Objetivo e gatilho

Restaurar o tempo de processamento sem perder isolamento entre organizações. Acione quando a idade do job mais antigo exceder 5 minutos ou a entrada superar a vazão por 10 minutos.

## Resposta

1. Registre tamanho, idade, taxa de entrada/saída e filas afetadas.
2. Identifique jobs com repetição, dependência lenta e organização com volume anormal usando somente IDs e métricas.
3. Pause produtores não essenciais se o banco estiver saturado; aumente consumidores apenas dentro dos limites medidos.
4. Mova falhas esgotadas para dead-letter e mantenha a chave idempotente no reprocessamento.
5. Confirme p95 abaixo do objetivo, backlog decrescente e ausência de duplicação.

## Escalonamento e evidência

Escalone imediatamente se houver risco de perda ou cruzamento de tenant. Registre gráficos, decisões e IDs amostrados, nunca conteúdo de mensagem.

## Exercício

Tabletop local em 2026-10-01: idempotência e dead-letter validados pelos testes do worker. Carga em staging será executada após o ambiente ser provisionado.
