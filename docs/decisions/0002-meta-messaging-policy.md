# ADR 0002 — Política de mensagens Meta

- Data: 2026-09-30
- Status: aceito com bloqueio por padrão

## Fontes oficiais

- [Cloud API webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components), consultada em 2026-09-30.
- [Envio de mensagens pela Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages), consultada em 2026-09-30.
- [WhatsApp Business Platform no Postman](https://www.postman.com/meta/whatsapp-business-platform/folder/lboq68h/webhooks), coleção mantida pela Meta, consultada em 2026-09-30.

As páginas oficiais da Meta não renderizaram no crawler. Categorias, janela, templates, consentimento, pricing e retries serão confirmados no dashboard/documentação acessível à conta antes do código de produção.

## Decisão

- Webhook aceita apenas HTTPS, challenge válido e POST cuja autenticidade seja confirmada conforme a documentação vigente.
- O body bruto é preservado até a verificação de assinatura.
- O endpoint persiste/deduplica antes de responder 2xx e delega trabalho pesado ao worker.
- Todo outbound passa por `PolicyEngine`; regra desconhecida resulta em `BLOCKED`.
- Envio fora de condição permitida exige template aprovado e consentimento conforme as regras vigentes confirmadas.
- Opt-out, conta inativa, cooldown, limite ou template incerto bloqueiam envio.
- A política é versionada e a decisão registra snapshot de contexto e razões estáveis.

## Alternativas rejeitadas

- IA decidir se o envio é permitido.
- Aceitar evento e processar IA dentro do request.
- Assumir janela/categoria fixa em código sem versão e ADR.

## Consequências

O smoke test prova somente challenge e verificação criptográfica local. Envio real permanece bloqueado até credenciais de teste e regras atuais serem validadas.
