# AGENTS.md — Campinho

Instruções para qualquer agente de código (Claude Code, Codex) que trabalhe neste repositório.
`CLAUDE.md` apenas importa este arquivo: **edite aqui**, não lá.

## O projeto

Campinho é uma prancheta tática de futebol de campo (11 contra 11), web, desktop-only, projeto pessoal, **sem login**.

- **Estado atual, decisões e próxima etapa: [`docs/memoria.md`](docs/memoria.md). Leia primeiro ao iniciar uma sessão e atualize ao final.**
- Especificação completa: [`docs/especificacao.md`](docs/especificacao.md). É a fonte da verdade sobre o comportamento.
- Plano de implementação e divisão de tarefas entre agentes: [`docs/plano-implementacao.md`](docs/plano-implementacao.md).
- Fora do escopo (não implementar): login, compartilhamento, bola/cones, export PNG, várias pranchetas, mobile.

## Stack (fechada — não propor alternativas)

- Vite + React 19 + TypeScript (strict), **pnpm**
- TanStack Router (file-based, SPA — sem SSR/TanStack Start), TanStack Query, Table, Form
- Zod para validação e tipos de dados externos (CSV, Supabase, localStorage)
- Tailwind CSS v4 + shadcn/ui
- Konva via react-konva (nenhuma outra lib de canvas)
- Zustand + zundo (undo/redo)
- Papa Parse (CSV)
- Supabase com anon key + RLS permissiva, sem Auth
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

Variáveis de ambiente em `.env.local` (fora do git): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (chave publishable `sb_publishable_…`; nunca a secret/service_role).

## Estrutura e responsabilidade por pasta

```
src/
  routes/              # TanStack Router: / (prancheta), /times
  components/board/    # Konva: campo, tokens, banco, ferramentas de desenho
  components/teams/    # CRUD de times, tabela de jogadores, diálogo de importação
  components/ui/       # shadcn/ui (gerado)
  stores/              # Zustand + zundo
  lib/csv/             # parser/validador de CSV (puro, sem React)
  lib/formations/      # formações fixas, espelhamento, validação de custom (puro)
  lib/geometry/        # coordenadas do campo, hit-test, setas/curvas (puro)
  lib/colors/          # contraste do goleiro, cores parecidas (puro)
  lib/persistence/     # schema e versionamento do localStorage (puro)
  lib/supabase/        # client e queries
supabase/migrations/   # SQL
docs/
```

Tudo em `src/lib/**` é **lógica pura**: sem React, sem Konva, sem acesso a rede ou DOM. Cada módulo tem testes Vitest ao lado (`*.test.ts`).

## Regras para agentes

1. **Siga a especificação.** Na dúvida, pergunte em vez de inventar comportamento. Não adicione features fora da spec.
2. **Trabalhe só nos arquivos da sua tarefa.** Se a tarefa delimitar pastas, não edite fora delas. Em especial, **não altere `package.json`, `pnpm-lock.yaml`, configs (vite, tsconfig, eslint) nem `AGENTS.md`/`CLAUDE.md`** sem que a tarefa peça; se precisar de uma dependência, diga isso no relatório final.
3. **Não faça commit, push, nem crie branches.** O tech lead (Claude) revisa e faz os commits, um por etapa.
4. **Testes obrigatórios** para lógica em `src/lib/**`. Antes de terminar, rode `pnpm test` e `pnpm typecheck` e informe o resultado real (inclusive falhas).
5. **TypeScript strict**, sem `any` (use `unknown` + Zod nas fronteiras). Exports nomeados; funções puras e pequenas.
6. **Idioma:** textos da interface, mensagens de erro para o usuário e docs em português do Brasil. Identificadores de código em inglês.
7. **Relatório final** de cada tarefa: arquivos alterados, decisões tomadas, o que ficou de fora e resultado dos testes.

## Convenções de domínio

- Campo vertical, em metros: largura 68 (eixo x), comprimento 105 (eixo y). Origem no canto superior esquerdo. Converter metros ↔ pixels apenas na camada de render.
- Mandante joga embaixo, visitante em cima. Formações são definidas para o time de baixo e **espelhadas** para o de cima.
- Posições válidas: `GOL, LD, ZAG, LE, ALD, ALE, VOL, MC, MEI, MD, ME, PD, PE, SA, ATA`.
