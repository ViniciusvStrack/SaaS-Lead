# SaaS Lead — Roadmap de Implementação

## Como usar

Execute uma fase por vez. Cada tarefa deve ter escopo pequeno, revisão de diff e validação. Não iniciar a fase seguinte com falhas críticas abertas na fase anterior.

## Fase 0 — Produto e ambiente

- [ ] Definir o nicho do beta.
- [ ] Validar a proposta de valor com 3–5 empresas.
- [x] Fixar Node 24 e pnpm 11.22 no projeto.
- [ ] Fazer instalação limpa com lockfile.
- [ ] Fazer lint passar.
- [ ] Fazer typecheck passar.
- [ ] Fazer testes passarem.
- [ ] Fazer build passar.
- [ ] Corrigir encoding e referências quebradas da documentação.

## Fase 1 — Persistência e wiring de produção

- [ ] Implementar repository Prisma de organizações.
- [ ] Implementar store Prisma de auditoria.
- [ ] Implementar persistência de convites.
- [ ] Implementar repositories Prisma de contatos, conversas e mensagens.
- [ ] Implementar store persistente de webhook.
- [ ] Registrar os módulos reais no `AppModule`.
- [ ] Remover providers em memória do runtime.
- [ ] Adicionar testes de restart e persistência.

## Fase 2 — WhatsApp e ingestão

- [ ] Implementar endpoint GET de verificação da Meta.
- [ ] Implementar endpoint POST de webhook.
- [ ] Validar assinatura usando o corpo bruto.
- [ ] Resolver organização por `phone_number_id`.
- [ ] Persistir eventos de forma idempotente.
- [ ] Publicar normalização na fila.
- [ ] Implementar retries e dead-letter.
- [ ] Registrar mensagens não textuais sem quebrar o fluxo.
- [ ] Implementar reconciliação de mensagens enviadas.
- [ ] Testar payloads reais e duplicados.

## Fase 3 — Inteligência comercial

- [ ] Definir schema de análise comercial versionado.
- [ ] Implementar score de temperatura e intenção.
- [ ] Detectar objeções, urgência e produto de interesse.
- [ ] Detectar lead sem retorno.
- [ ] Gerar próxima ação com justificativa.
- [ ] Persistir uso e custo por organização.
- [ ] Criar evals com conversas reais anonimizadas.
- [ ] Medir falso positivo e falso negativo.

## Fase 4 — Configuração da empresa

- [ ] Produtos e serviços.
- [ ] Ticket médio.
- [ ] Regiões atendidas.
- [ ] Horários.
- [ ] Regras de desconto.
- [ ] Critérios de lead quente.
- [ ] Objeções comuns.
- [ ] Responsáveis e distribuição.
- [ ] Tom de voz.
- [ ] Prazo de follow-up.

## Fase 5 — Dashboard vendável

- [ ] Visão geral de métricas.
- [ ] Lista de oportunidades com filtros.
- [ ] Detalhe da oportunidade e conversa.
- [ ] Sugestão de próxima ação.
- [ ] Aprovação de follow-up.
- [ ] Atribuição de responsável.
- [ ] Histórico de atividades.
- [ ] Configuração comercial.
- [ ] Tela de uso e limites.
- [ ] Estados de loading, erro e vazio.

## Fase 6 — Segurança, privacidade e operação

- [ ] Revisar isolamento de tenant em todos os endpoints.
- [ ] Revisar RBAC.
- [ ] Criptografar ou proteger credenciais externas.
- [ ] Persistir auditoria.
- [ ] Implementar exportação e exclusão de dados.
- [ ] Executar retenção automática.
- [ ] Adicionar rate limiting.
- [ ] Implementar graceful shutdown.
- [ ] Testar backup e restore.
- [ ] Validar runbooks de incidentes.

## Fase 7 — Billing

- [ ] Criar catálogo de planos.
- [ ] Aplicar limites por mensagens, usuários e números.
- [ ] Registrar consumo idempotente.
- [ ] Implementar checkout.
- [ ] Implementar webhooks do provedor de pagamento.
- [ ] Implementar upgrade, downgrade e cancelamento.
- [ ] Implementar período de teste.
- [ ] Implementar excedente com teto de segurança.
- [ ] Exibir uso no dashboard.

## Fase 8 — Beta controlado

- [ ] Selecionar 3–5 empresas de um único nicho.
- [ ] Criar checklist de onboarding.
- [ ] Configurar feedback semanal.
- [ ] Medir oportunidades e follow-ups.
- [ ] Medir custo por cliente.
- [ ] Corrigir falsos positivos.
- [ ] Documentar casos de sucesso.
- [ ] Confirmar disposição de pagamento.

## Fase 9 — Chatbot controlado

- [ ] Respostas sugeridas.
- [ ] Aprovação humana.
- [ ] FAQ e catálogo.
- [ ] Transferência para humano.
- [ ] Agendamento.
- [ ] Regras para preços e descontos.
- [ ] Auditoria das respostas.

## Fase 10 — Jarvis

- [ ] Resumo diário no painel.
- [ ] Resumo por áudio.
- [ ] Ligação de voz.
- [ ] Consulta de riscos e indicadores.
- [ ] Ferramenta para criar tarefa.
- [ ] Ferramenta para atribuir tarefa.
- [ ] Ferramenta para enviar relatório.
- [ ] Confirmação antes de ações críticas.
- [ ] Auditoria completa de cada ação.
