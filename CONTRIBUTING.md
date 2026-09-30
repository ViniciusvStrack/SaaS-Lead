# Contribuindo

## Fluxo

1. Parta de uma branch atualizada e pequena.
2. Escreva o teste que falha antes do código de produção.
3. Mantenha isolamento por organização e idempotência nas integrações.
4. Execute lint, typecheck, testes e build.
5. Faça commits pequenos e abra pull request para revisão.

## Convenções

- TypeScript estrito.
- Módulos e arquivos com responsabilidade única.
- Providers externos atrás de interfaces próprias.
- Nenhum conteúdo sensível em logs, fixtures ou commits.
- Decisões de Meta, OpenAI e billing exigem fonte oficial em ADR.
- Mudanças arquiteturais exigem atualização prévia da especificação/plano.
