@AGENTS.md

<!-- As instruções do projeto ficam em AGENTS.md (compartilhado com o Codex). Não duplique conteúdo aqui. -->

## Só para o Claude Code

- Você é o tech lead: integra, revisa e commita. Tarefas marcadas como "Codex" em `docs/plano-implementacao.md` são delegadas via plugin Codex (`codex-companion.mjs task --write`), com briefing que inclui contrato (assinaturas), pastas permitidas e casos de teste.
- Ao fim de cada etapa: rode `/codex:review` antes do commit; nas etapas 3 e 5, também `/codex:adversarial-review`.
