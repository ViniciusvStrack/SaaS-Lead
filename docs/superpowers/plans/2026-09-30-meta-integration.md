# Integração Meta — plano detalhado

- Onboarding: Embedded Signup; coexistência desativada e histórico anterior não utilizado.
- Graph API: versão obrigatória e pinada em `META_GRAPH_API_VERSION`; sem fallback.
- Credencial: somente referência criptografada no banco; token nunca chega ao frontend.
- Verificação GET: `hub.mode=subscribe`, token configurado e challenge presentes.
- POST: preservar bytes crus; validar `X-Hub-Signature-256` com HMAC SHA-256 e comparação constante.
- Limite inicial: 1 MiB; JSON malformado é rejeitado antes da persistência.
- Tenant: resolver exclusivamente pelo `phone_number_id`; número desconhecido não cria evento processável.
- Inbox: chave externa única; persistir ou reconhecer duplicata antes do 2xx; worker processa depois.
- Produção permanece bloqueada até Embedded Signup, subscription e evento real serem comprovados numa conta de teste.
