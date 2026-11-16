# AGENTS.md — Prancheta Tática

Instruções para qualquer agente de código (Claude Code, Codex) que trabalhe neste repositório.
`CLAUDE.md` apenas importa este arquivo: **edite aqui**, não lá.

## O projeto

Prancheta Tática é um app web para montar táticas de futebol de campo (11 contra 11), desktop-only, projeto de portfólio. Visitantes usam a prancheta com os times padrão; o login (cadastro com nome, e-mail e senha) libera times e formações privados.

- **Estado atual, decisões e próxima etapa: `docs/memoria.md`. Leia primeiro ao iniciar uma sessão e atualize ao final.** É um arquivo local, fora do git (assim como `docs/verificacao-painel.md`).
- Especificação completa: [`docs/especificacao.md`](docs/especificacao.md). É a fonte da verdade sobre o comportamento.
- Arquitetura, motivo da stack e regras do código (para desenvolvedores): [`docs/arquitetura.md`](docs/arquitetura.md). Mantenha atualizado (regra 7).
- Plano de implementação e divisão de tarefas entre agentes: [`docs/plano-implementacao.md`](docs/plano-implementacao.md).
- Fora do escopo (não implementar): confirmação de e-mail, recuperação de senha, compartilhamento, bola/cones, export PNG, várias pranchetas, mobile.

## Stack (fechada — não propor alternativas)

- Vite + React 19 + TypeScript (strict), **pnpm**
- TanStack Router (file-based, SPA — sem SSR/TanStack Start), TanStack Query, Table, Form
- Zod para validação e tipos de dados externos (CSV, Supabase, localStorage)
- Tailwind CSS v4 + shadcn/ui
- Konva via react-konva (nenhuma outra lib de canvas)
- Zustand + zundo (undo/redo)
- Papa Parse (CSV)
- Supabase com chave publishable, Auth só com e-mail e senha (sem Google, sem confirmação de e-mail) e RLS por dono (`user_id` nulo = time padrão)
- Vitest para testes

## Comandos

```bash
pnpm install
pnpm dev          # servidor local
pnpm test         # vitest run
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm build
```

Se `pnpm` não estiver no PATH (acontece no sandbox do Codex no Windows), chame as ferramentas direto pelo Node: `node node_modules/vitest/vitest.mjs run` e `node node_modules/typescript/bin/tsc --noEmit`. Grave arquivos em UTF-8 **sem BOM**.

Variáveis de ambiente em `.env.local` (fora do git): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (chave publishable `sb_publishable_…`). O app nunca usa a chave secreta. Só `pnpm squads:seed` lê `SUPABASE_SECRET_KEY`, que **nunca** leva o prefixo `VITE_`, porque esse prefixo a colocaria no navegador.

## Estrutura e responsabilidade por pasta

```
src/
  routes/              # TanStack Router: / (prancheta), /times
  components/board/    # Konva: campo, tokens, banco, ferramentas de desenho
  components/teams/    # CRUD de times, tabela de jogadores, diálogo de importação
  components/ui/       # button, dialog, alert-dialog: escritos à mão sobre radix-ui
  hooks/               # TanStack Query (times, jogadores, formações) e tamanho do contêiner
  stores/              # Zustand + zundo
  lib/csv/             # parser/validador de CSV (puro, sem React)
  lib/formations/      # formações fixas, espelhamento, validação de custom (puro)
  lib/geometry/        # coordenadas do campo, hit-test, setas/curvas (puro)
  lib/colors/          # contraste do goleiro, cores parecidas (puro)
  lib/persistence/     # schema e versionamento do localStorage (puro)
  lib/supabase/        # client e queries
  lib/auth/            # validação de credenciais e mensagens de erro do login (puro)
  lib/players/          # ordenação do elenco (puro)
  lib/squads/           # elenco da Wikipédia: parser, titulares e CSV (puro)
  lib/board/            # formação inicial, encaixe e pilhas dos jogadores (puro)
  lib/teams/            # dono do time: padrão ou do usuário (puro)
  lib/positions.ts      # lista de posições válidas
supabase/migrations/   # SQL
supabase/tests/        # testes de acesso (RLS), rodados à mão num Postgres
data/serie-a-2026/     # times padrão: CSVs revisados, clubs.json, manifest.json
scripts/               # coleta (squads:fetch) e carga (squads:seed) dos times padrão
docs/
```

Tudo em `src/lib/**` é **lógica pura**: sem React, sem Konva, sem acesso a rede ou DOM. A exceção é `src/lib/supabase/` (`client.ts` e `queries.ts`), o único ponto de acesso à rede. Cada módulo tem testes Vitest ao lado (`*.test.ts`).

## Regras para agentes

1. **Siga a especificação.** Na dúvida, pergunte em vez de inventar comportamento. Não adicione features fora da spec.
2. **Trabalhe só nos arquivos da sua tarefa.** Se a tarefa delimitar pastas, não edite fora delas. Em especial, **não altere `package.json`, `pnpm-lock.yaml`, configs (vite, tsconfig, eslint) nem `AGENTS.md`/`CLAUDE.md`** sem que a tarefa peça; se precisar de uma dependência, diga isso no relatório final.
3. **Não faça commit, push, nem crie branches.** O tech lead (Claude) revisa e faz os commits, um por etapa.
4. **Testes obrigatórios** para lógica em `src/lib/**`. Antes de terminar, rode `pnpm test` e `pnpm typecheck` e informe o resultado real (inclusive falhas).
5. **TypeScript strict**, sem `any` (use `unknown` + Zod nas fronteiras). Exports nomeados; funções puras e pequenas.
6. **Idioma:** textos da interface, mensagens de erro para o usuário e docs em português do Brasil. Identificadores de código em inglês.
7. **Comentários e documentação acompanham o código.** A cada implementação nova ou mudança de comportamento, avalie duas coisas antes de terminar:
   - **Comentário:** o trecho precisa de um? Comente o que é importante e não é óbvio (o porquê de uma regra, uma armadilha, uma unidade, o papel de um módulo), de forma concisa, em português, num nível que um iniciante entenda. Não comente o óbvio nem repita o que o nome já diz. Se a mudança deixar um comentário existente errado, corrija-o.
   - **Documentação:** a mudança altera a arquitetura, uma regra, uma decisão de stack, o modelo de dados, o formato salvo ou um fluxo descrito em [`docs/arquitetura.md`](docs/arquitetura.md)? Se sim, atualize o documento na mesma tarefa. Se não, diga no relatório final que avaliou e não era preciso.
8. **Relatório final** de cada tarefa: arquivos alterados, decisões tomadas, o que ficou de fora, se comentários e `docs/arquitetura.md` foram atualizados (ou por que não era preciso) e resultado dos testes.

## Convenções de domínio

- Campo vertical, em metros: largura 68 (eixo x), comprimento 105 (eixo y). Origem no canto superior esquerdo. Converter metros ↔ pixels apenas na camada de render.
- Mandante joga embaixo, visitante em cima. Formações são definidas para o time de baixo e **espelhadas** para o de cima.
- Posições válidas: `GOL, LD, ZAG, LE, VOL, MC, MEI, MD, ME, PD, PE, SA, ATA`.
