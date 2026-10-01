# Deploy de staging e produção

## Estado atual

O Blueprint em `infra/deploy/render.yaml` é uma declaração revisável, não evidência de um ambiente criado. `infra/deploy/staging.contract.json` permanece como `DECLARED_NOT_PROVISIONED` e `productionApproved: false` até que credenciais, domínio e orçamento sejam fornecidos e os gates abaixo tenham evidência real.

## Arquitetura escolhida

Render Blueprint com web, API, worker, PostgreSQL e Key Value gerenciados. TLS termina na plataforma; segredos entram como variáveis `sync: false`; banco e cache aceitam apenas rede privada. Deploy automático fica desligado. Os planos pagos mínimos evitam suspensão de serviços durante o beta.

## Primeiro provisionamento

1. Validar o Blueprint com Render CLI 2.7 ou superior.
2. Criar um projeto de staging apontando para `infra/deploy/render.yaml`.
3. Inserir `META_GRAPH_API_VERSION`, `META_APP_SECRET` e `API_BASE_URL` no painel; nunca em Git ou logs.
4. Antes de sincronizar, conectar o worker a Redis/BullMQ e aos adapters persistentes. O processo atual apenas inicializa e encerra, portanto este é um bloqueio explícito.
5. Sincronizar o Blueprint e observar o `preDeployCommand` de migrations.
6. Validar `/health/live` e `/health/ready`, depois executar `pnpm test:system` com providers fake.

## Release versionado

1. CI deve passar em commit imutável.
2. Fazer backup e registrar timestamp/identificador.
3. Executar migrations compatíveis com a versão anterior.
4. Implantar API e worker; aguardar readiness. Implantar web por último.
5. Executar smoke de login, webhook, isolamento e ciclo crítico.
6. Registrar versão, responsável, evidências e decisão de liberar.

## Rollback

Reimplantar o último commit saudável. Nunca reverta migration destrutiva automaticamente: use migration corretiva compatível. Se houver risco de integridade, coloque a API em manutenção, restaure em banco isolado e siga `backup-restore.md`.

## Gates obrigatórios

- Restore real medido e verificado.
- Isolamento negativo em API, worker, export e cache.
- Worker consumindo filas persistentes e dead-letter.
- Alertas entregues a uma pessoa responsável.
- Smoke Meta com conta de teste real e sem dados de cliente.
- Revisão de secrets, LGPD e contratos.
- Beta de 3–5 empresas concluído.

Falha em qualquer gate mantém `productionApproved: false`.
