# Auth/SaaS Core — plano detalhado

## Decisões

- Identidade nativa passwordless no MVP; sem senha e sem SSO.
- Convites e links de acesso usam token aleatório de alta entropia, persistindo apenas SHA-256, expiram e são de uso único.
- Sessão opaca server-side; cookie `saas_lead_session` com `HttpOnly`, `Secure` em produção, `SameSite=Lax` e escopo `/`.
- A organização ativa vem da sessão e de membership ativa; headers de tenant usados na Task 4 deixam de ser fronteira confiável.
- E-mail é uma porta (`AuthMailer`), permitindo escolher o provedor transacional sem contaminar o domínio.
- Sem credenciais, hashes ou tokens em respostas, logs ou estado do frontend.

## Lifecycle do convite

1. OWNER/ADMIN cria convite para e-mail, organização e papel permitido.
2. O backend invalida convite pendente anterior equivalente, salva hash e entrega o token apenas à porta de e-mail.
3. Aceite válido cria/reativa membership e consome o convite atomicamente.
4. Token expirado, consumido ou de outro tenant retorna a mesma resposta genérica.

## Matriz RBAC

| Ação | OWNER | ADMIN | AGENT |
|---|---:|---:|---:|
| organization.read | sim | sim | sim |
| organization.update | sim | sim | não |
| membership.read | sim | sim | não |
| membership.invite | sim | sim | não |
| membership.change_role | sim | não | não |
| billing.manage | sim | não | não |
| conversation.read | sim | sim | sim |
| message.approve | sim | sim | sim |

OWNER não pode remover ou rebaixar o último OWNER da organização. Todas as consultas continuam vinculadas ao `TenantContext`.

## Entrega desta etapa

- Domínio testável de sessão, convite e autorização.
- Guard/decorator Nest para ações protegidas.
- Utilitário web `requireSession()` que usa somente o cookie HTTP-only via backend.
- Telas mínimas de login e aceite de convite, sem expor token após a troca.
