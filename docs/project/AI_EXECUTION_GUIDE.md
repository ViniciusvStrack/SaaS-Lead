# Guia de Execução com Outras IAs

## Regra principal

Nenhuma IA deve receber o pedido genérico de finalizar o projeto inteiro. Cada IA deve executar uma tarefa pequena, verificável e reversível.

## Prompt mestre

```text
Você está trabalhando no projeto SaaS Lead.

Leia primeiro:
- README.md
- docs/project/PROJECT_CONTEXT.md
- docs/project/IMPLEMENTATION_ROADMAP.md
- CONTRIBUTING.md
- os arquivos diretamente relacionados à tarefa

Antes de editar:
1. explique o estado atual;
2. liste os arquivos que pretende alterar;
3. explique riscos e dependências;
4. proponha testes.

Regras:
- preserve alterações existentes;
- não altere arquivos fora do escopo sem explicar;
- não use persistência em memória no runtime;
- respeite organizationId em todas as operações;
- não remova testes existentes;
- adicione ou atualize testes;
- não invente credenciais, endpoints ou comportamento da Meta;
- não registre secrets nos logs;
- execute a validação disponível ao terminar.

Entrega obrigatória:
- resumo das mudanças;
- arquivos alterados;
- testes executados e resultado;
- problemas restantes;
- próximo passo recomendado.
```

## Prompt de auditoria

```text
Faça uma auditoria somente leitura da tarefa indicada.
Não edite arquivos.

Verifique:
- corretude;
- isolamento por tenant;
- persistência;
- idempotência;
- segurança;
- tratamento de erros;
- testes ausentes;
- impacto em outros módulos.

Leia o contexto permanente antes de analisar. Entregue achados priorizados por severidade, com arquivo e linha quando possível.
```

## Prompt de implementação

```text
Implemente somente esta tarefa:

[COLE A TAREFA DO ROADMAP]

Critérios de aceitação:
- [critério 1]
- [critério 2]
- [critério 3]

Não implemente funcionalidades futuras. Antes de editar, apresente o plano. Depois rode os testes relevantes e atualize a documentação se necessário.
```

## Prompt de testes

```text
Revise a implementação da tarefa abaixo e crie os testes que faltam:

[COLE A TAREFA]

Cubra sucesso, falhas, duplicidade, autorização, tenant isolation e limites quando aplicável. Não altere o comportamento apenas para fazer o teste passar. Execute os testes e informe o resultado.
```

## Prompt de revisão de segurança

```text
Faça uma revisão de segurança focada na tarefa abaixo:

[COLE A TAREFA]

Procure especialmente por vazamento entre organizações, autenticação insuficiente, autorização ausente, secrets em logs, replay de webhook, falta de idempotência, SSRF, validação incompleta e envio não autorizado de mensagens. Não edite ainda; entregue achados priorizados.
```

## Prompt de fechamento

```text
Verifique se a tarefa está pronta para merge.

Execute lint, typecheck, testes relevantes e build quando possível. Confira o diff contra o escopo, documentação, migrations e testes. Não faça mudanças adicionais sem listar previamente o motivo. Entregue uma decisão: pronto, pronto com ressalvas ou não pronto.
```

## Ordem recomendada para as IAs

1. Auditoria do estado atual.
2. Implementação da tarefa.
3. Testes.
4. Revisão de segurança.
5. Fechamento e validação.

Não deixar duas IAs editarem os mesmos arquivos simultaneamente.

## Formato de relatório de cada tarefa

```text
Status: pronto | pronto com ressalvas | bloqueado

Resumo:

Arquivos alterados:

Testes executados:

Decisões tomadas:

Riscos restantes:

Próximo item do roadmap:
```
