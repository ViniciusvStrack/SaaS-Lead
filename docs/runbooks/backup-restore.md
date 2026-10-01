# Backup e restauração

## Objetivo

Restaurar dados de uma janela conhecida, preservar isolamento e comprovar integridade antes de liberar o serviço.

## Procedimento

1. Declare incidente, congele escritas e registre o ponto de recuperação aprovado.
2. Restaure o backup em ambiente isolado, nunca diretamente sobre produção.
3. Aplique migrações até a versão da aplicação e valide contagens por organização, constraints, solicitações de privacidade e trilhas de auditoria.
4. Verifique uma amostra por IDs, sem exportar conteúdo sensível para logs.
5. Promova o ambiente restaurado somente após aprovação de engenharia e responsável de negócio.
6. Reabra escritas, monitore erros e reconcilie eventos recebidos após o ponto restaurado por chave idempotente.

## Critérios e evidência

O exercício passa quando RPO/RTO contratados são medidos, checks de integridade passam e nenhuma organização acessa dados de outra. Guarde timestamps, hashes, versões e aprovações.

## Exercício

Em 2026-10-01 foi feita revisão tabletop do procedimento. Um teste completo não foi declarado: exige backup real e staging provisionado na etapa de entrega.
