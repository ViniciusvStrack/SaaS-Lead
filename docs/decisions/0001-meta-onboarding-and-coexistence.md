# ADR 0001 — Onboarding Meta e coexistência

- Data: 2026-09-30
- Status: aceito para o MVP; detalhes dependentes da conta são gates do smoke test

## Fontes oficiais

- [Embedded Signup overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview), consultada em 2026-09-30.
- [Onboarding de usuários do WhatsApp Business App](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users), consultada em 2026-09-30.
- [WhatsApp Business Platform no Postman](https://www.postman.com/meta/whatsapp-business-platform/overview), coleção mantida pela Meta, consultada em 2026-09-30.

As páginas `developers.facebook.com` não foram renderizadas pelo crawler usado no discovery. Por isso, nenhum detalhe de elegibilidade, versão ou sincronização histórica será tratado como confirmado sem validação no dashboard e com uma conta de teste.

## Decisão

- `META_ONBOARDING_MODE=embedded_signup`.
- Implementar Embedded Signup como caminho padrão de onboarding.
- Manter coexistência atrás de `META_COEXISTENCE_ENABLED=false` até uma conta real elegível completar o fluxo e seus eventos serem capturados.
- Não depender de histórico anterior à conexão. O produto deve funcionar somente com eventos recebidos após onboarding.
- `META_GRAPH_API_VERSION` é variável obrigatória sem fallback silencioso. A versão aprovada será pinada no ambiente após validação no dashboard da Meta.
- Armazenar somente IDs externos necessários e referência criptografada da credencial; nenhum token vai ao frontend.

## Alternativas rejeitadas

- Automação do WhatsApp Web: incompatível com os princípios e risco comercial inaceitável.
- Migração/coexistência como requisito do MVP: elegibilidade e comportamento variam por conta.
- Provider BSP obrigatório desde o início: aumenta dependência antes de provar necessidade.

## Consequências

O onboarding é encapsulado em `WhatsAppProvider`. A interface aceita capacidades detectadas por conta. Funcionalidades dependentes de coexistência são ocultadas quando a capability não estiver confirmada.

## Prova necessária

Completar Embedded Signup em conta de desenvolvimento, registrar WABA/phone number IDs, validar subscriptions e capturar um evento real. Coexistência só muda para `true` após prova equivalente.
