# Checklist de segurança para lançamento

Cada item exige responsável, data e link de evidência. Marcar somente após execução no ambiente alvo.

## Identidade e tenant

- [ ] Sessões expiram, tokens são hashados e cookies usam `Secure`, `HttpOnly` e `SameSite`.
- [ ] OWNER, ADMIN e AGENT possuem testes positivos e negativos.
- [ ] API, worker, cache, exports e jobs rejeitam acesso cruzado entre organizações.
- [ ] Contas suspensas perdem acesso imediatamente.

## Dados e segredos

- [ ] Nenhum segredo existe no repositório, imagem, log ou bundle web.
- [ ] Segredos possuem rotação, proprietário e acesso mínimo.
- [ ] Banco e Redis aceitam somente conexões privadas e TLS quando suportado.
- [ ] Backup criptografado e restauração completa foram testados.
- [ ] Retenção, exportação, exclusão e retenção legal foram revisadas juridicamente.

## Aplicação e fornecedores

- [ ] Webhooks validam assinatura, tamanho, replay e idempotência.
- [ ] Outbound bloqueia por padrão e exige aprovação humana no beta.
- [ ] Dependências críticas sem vulnerabilidade conhecida alta/crítica não aceita.
- [ ] Meta, IA e billing usam contas separadas para staging e produção.
- [ ] Logs e traces não contêm mensagens, telefones, tokens ou payloads brutos.

## Operação

- [ ] Alertas de API indisponível, fila acumulada, worker parado e provider degradado chegam ao plantonista.
- [ ] Rate limits, limites de custo e circuit breaker foram exercitados.
- [ ] Runbooks foram executados, não apenas lidos.
- [ ] Rollback foi cronometrado com a versão anterior.
- [ ] Incidentes possuem canal, responsáveis e modelo de comunicação ao cliente.

## Aprovação

- Engenharia: [ ] Nome/data/evidência
- Segurança: [ ] Nome/data/evidência
- Privacidade/jurídico: [ ] Nome/data/evidência
- Negócio: [ ] Nome/data/evidência
