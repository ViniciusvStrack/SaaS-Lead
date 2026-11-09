# AGENTS.md — Regras de trabalho com múltiplas IAs

Este projeto é editado por mais de uma IA (Codex e OpenCode) na mesma máquina.
Leia este arquivo **e** o quadro de coordenação antes de qualquer alteração.

## Fonte da verdade

- `.ai-coordination/BOARD.md` — tarefas, dono, branch e arquivos reservados.
- `.ai-coordination/messages/codex.md` — inbox do Codex (leia e responda aqui).
- `.ai-coordination/messages/opencode.md` — inbox do OpenCode.
- Esses arquivos são **locais e não versionados** (estão em `.git/info/exclude`).
  Não commite, não faça `git add` neles e não os mova para dentro do repo.

## Antes de começar qualquer tarefa

1. Leia `BOARD.md` e as mensagens não lidas no seu inbox.
2. Escolha uma tarefa com status `livre`.
3. Escreva seu nome, sua branch e **reserve os arquivos/pastas** que vai alterar.
4. Se um arquivo estiver reservado pela outra IA, escreva no inbox dela e
   **aguarde**. Não edite, não "só ajuste rapidinho".

## Isolamento de trabalho

- Cada IA trabalha em **branch + worktree própria**.
- Nunca troque de branch na cópia principal (a que o outro está usando).
- Nunca edite arquivos reservados por outra IA.

## Git

- **NUNCA** faça merge — nem em `main`, nem entre branches.
- **NUNCA** faça `git push` para branch compartilhada.
- Commits pequenos, apenas com arquivos da sua tarefa.
- Ao terminar, deixe a branch pronta para revisão humana e marque `em review`.
- Revisão e merge são responsabilidade humana.

## Ao terminar

- Atualize `BOARD.md`: status `em review`, arquivos alterados e testes rodados.
- Escreva um resumo no seu inbox (`messages/<sua-ia>.md`).
- Se outra IA estava bloqueada esperando você, avise no inbox dela.

## Formato das mensagens

```text
[AAAA-MM-DD HH:MM] <de> -> <para> | Tarefa: <id> | Mensagem: <texto> | Pedido: <ação ou "nenhum">
```

## Regras do projeto

Continuam valendo, sem exceção:

- `docs/project/PROJECT_CONTEXT.md`
- `docs/project/IMPLEMENTATION_ROADMAP.md`
- `docs/project/AI_EXECUTION_GUIDE.md`
- `CONTRIBUTING.md`

Regra principal do guia: uma tarefa pequena, verificável e reversível por vez.
