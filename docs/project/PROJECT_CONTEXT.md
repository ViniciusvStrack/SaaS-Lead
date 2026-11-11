# SaaS Lead — Contexto Permanente do Projeto

## Objetivo

Construir um SaaS de inteligência comercial para empresas que vendem pelo WhatsApp Business Platform oficial.

O produto inicial é um assistente comercial: ele analisa conversas, identifica oportunidades, aponta riscos, recomenda a próxima ação e ajuda a equipe a recuperar leads esquecidos.

O produto não deve começar como um chatbot genérico. Chatbot e Jarvis são extensões posteriores da mesma base comercial.

## Visão do produto

1. Assistente de leads: análise, score, riscos e recomendações.
2. Copiloto comercial: respostas sugeridas, regras da empresa e follow-up aprovado.
3. Chatbot controlado: automações simples com transferência para humano.
4. Jarvis: resumo executivo por voz e execução segura de tarefas por ferramentas.

## Resultado principal para o cliente

O cliente deve perder menos leads por falta de acompanhamento e tomar decisões comerciais melhores.

Métricas importantes:

- leads recebidos;
- leads analisados;
- oportunidades detectadas;
- leads sem retorno;
- tempo até o próximo follow-up;
- sugestões aceitas;
- oportunidades recuperadas;
- conversão por origem e responsável;
- custo de IA por organização.

## Planos de referência

Estes valores são hipóteses comerciais para validação no beta:

- Essencial: R$ 397/mês, 2.000 mensagens analisadas, 3 usuários, 1 número.
- Profissional: R$ 897/mês, 10.000 mensagens analisadas, 8 usuários, 2 números.
- Performance: R$ 1.797/mês, 30.000 mensagens analisadas, 20 usuários, 5 números.
- Jarvis: a partir de R$ 3.497/mês, com voz e automações avançadas.

Os limites devem ser configuráveis no banco e aplicados por organização. Não criar planos ilimitados.

## Arquitetura atual

- `apps/api`: API NestJS e módulos de negócio.
- `apps/web`: frontend Next.js.
- `apps/worker`: processamento assíncrono e filas BullMQ.
- `packages/contracts`: tipos e contratos compartilhados.
- `packages/database`: Prisma, PostgreSQL e contexto de tenant.
- `packages/ai`: providers e schemas de análise.
- `packages/policy`: regras para mensagens de saída.
- `packages/whatsapp`: abstração do provedor WhatsApp e Meta Cloud.
- `packages/config`: validação de ambiente.
- `packages/observability`: logs e correlação.

## Fluxo de negócio alvo

```text
Meta Webhook
  -> validação de assinatura
  -> identificação do número e organização
  -> persistência idempotente do evento
  -> fila de normalização
  -> contato/conversa/mensagem
  -> análise de IA
  -> oportunidade e score
  -> sugestão de próxima ação
  -> aprovação humana
  -> envio e reconciliação
  -> métricas e auditoria
```

## Regras obrigatórias para qualquer alteração

- Toda operação de negócio deve respeitar `organizationId`.
- Nunca usar store em memória como provider de produção.
- Implementações em memória são permitidas apenas em testes.
- Não remover testes existentes para fazer a suíte passar.
- Não alterar contratos públicos sem avaliar consumidores.
- Mensagens de saída precisam respeitar política, consentimento e idempotência.
- A IA sugere; ações sensíveis precisam de aprovação ou ferramenta autorizada.
- Dados, tokens e segredos não podem aparecer em logs.
- Toda alteração deve incluir testes proporcionais ao risco.
- Preferir mudanças pequenas e reversíveis.

## Comandos oficiais

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:system
pnpm build
```

## Estado conhecido no início do plano

- Existe boa base de autenticação, conversas, análise, oportunidades, filas, billing e privacidade.
- A aplicação ainda contém providers em memória usados no runtime.
- O `AppModule` ainda não conecta todos os módulos existentes.
- O webhook precisa ser fechado como endpoint real e persistente.
- O ambiente precisa validar Node 24 e pnpm 11.22.
- A suíte completa precisa ser executada em ambiente compatível antes de declarar estabilidade.
