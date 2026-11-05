# Plano de implementação — Campinho

Spec: [`especificacao.md`](especificacao.md). Regras dos agentes: [`../AGENTS.md`](../AGENTS.md).

## Divisão de papéis

| Papel | Quem | Faz |
|---|---|---|
| Tech lead | Claude Code | Scaffold, configs e dependências, UI/Konva, stores, integração, revisão dos diffs do Codex, commits |
| Implementador | Codex | Módulos de lógica pura em `src/lib/**` com testes, SQL do Supabase |
| Revisor | Codex | `/codex:review` ao fim de cada etapa; `/codex:adversarial-review` nas etapas de maior risco |

**Por que essa divisão:** a lógica pura tem contrato claro (entrada → saída), dá para testar sem UI e mora em pastas isoladas. Por isso o Codex pode trabalhar nela em paralelo sem conflitar com o Claude no mesmo working tree. A interação no canvas (arrastar, empilhar, ferramentas) depende de ajuste fino visual e de integração entre stores, e fica com o Claude.

## Modelos e esforço

Configuração padrão do Codex na máquina: `gpt-6.1-sol` / `high`. O `gpt-5.3-codex-spark` não está disponível com login pelo ChatGPT, então o que varia por tarefa é o esforço:

| Perfil | Modelo | Esforço | Quando |
|---|---|---|---|
| Mecânico | `gpt-6.1-sol` | `low` | Dados tabelados, SQL simples, schemas Zod |
| Lógica com bordas | `gpt-6.1-sol` | `medium` | Parser, geometria, algoritmos com muitos casos de teste |
| Revisão de risco | `gpt-6.1-sol` | `high` / `xhigh` | Revisão adversarial de arrastar/empilhar e do histórico de undo |

## Protocolo de delegação

1. O Claude instala as dependências e cria a pasta com um stub (`index.ts` com as assinaturas) **antes** de delegar.
2. O briefing ao Codex traz: objetivo, assinaturas exatas, pastas permitidas, casos de teste obrigatórios e "não mexer em package.json/configs, não commitar".
3. Execução: `codex-companion.mjs task --write --model … --effort …` em segundo plano. Enquanto isso, o Claude trabalha na UI da mesma etapa.
4. Na volta: o Claude lê o diff, roda `pnpm test && pnpm typecheck`, ajusta e integra. Pedidos de ajuste vão para a mesma thread (`--resume-last`).
5. Fim da etapa: `/codex:review` (e o adversarial, quando indicado), correções, commit.

## Etapas

### Etapa 1 — Scaffold + campo
- **Claude:** Vite + React 19 + TS strict, pnpm, TanStack Router (rotas `/` e `/times`), Tailwind v4, shadcn/ui, Vitest, ESLint, scripts. Campo em Konva (gramado, linhas, áreas, meia-lua) escalando com o container.
- **Codex C1 — `src/lib/geometry/pitch.ts`** · sol / low
  Constantes do campo (68×105 e medidas oficiais das marcações), `metersToPx`/`pxToMeters` dada uma escala, `mirror(point)` para o time de cima, `isInsidePitch`, `clampToPitch`. Testes.
- **Revisão:** `/codex:review`.

### Etapa 2 — Supabase + times + CSV
- **Claude:** client Supabase, hooks TanStack Query, página `/times` (CRUD + TanStack Table), diálogo de importação com prévia (TanStack Form), confirmação de substituição. Passo a passo para criar o projeto no Supabase.
- **Codex C2 — `src/lib/csv/`** · sol / medium
  `decodeCsvBytes(bytes): { text, encoding }` (UTF-8 com/sem BOM vs. Windows-1252), `parsePlayersCsv(text): { rows, issues }` com Papa Parse e Zod. Cabeçalho tolerante a caixa e acentos, `numero` opcional, `titular` S/N com padrão "11 primeiros", posição desconhecida = aviso, nome/posição ausentes = erro, linhas vazias ignoradas, número duplicado = aviso. Testes com fixtures (incluindo um arquivo em Windows-1252).
- **Codex C3 — `supabase/migrations/0001_init.sql` + `src/lib/supabase/schemas.ts`** · sol / low
  Tabelas `teams`, `players`, `formations` (FKs, `on delete cascade`, `unique(teams.name)`, índices), RLS habilitada com políticas permissivas para `anon`. Schemas Zod espelhando as linhas.
- **Revisão:** `/codex:review`.

### Etapa 3 — Formações + banco
- **Claude:** seletores de time, tokens, painel de banco, arrastar e soltar (empilhar, voltar ao lugar), Esconder/Resetar, tooltip, override de cor, CRUD de formações custom.
- **Codex C4 — `src/lib/formations/`** · sol / medium
  Coordenadas dos slots das 5 formações fixas (time de baixo), `mirrorFormation`, `assignPlayersToSlots(players, formation)` (casa primeiro por posição e depois preenche), `validateCustomFormation` (exatamente 11, um GOL). Testes.
- **Codex C5 — `src/lib/colors/`** · sol / low
  `contrastColor(hex)` para o goleiro (WCAG), `areColorsSimilar(a, b)` (ΔE CIE76 com limiar configurável), `textColorOn(hex)`. Testes.
- **Revisão:** `/codex:review` + `/codex:adversarial-review` focado em drag/drop, empilhamento e estados de "volta ao lugar" (sol / high).

### Etapa 4 — Desenho
- **Claude:** camada de desenho em Konva, toolbar, estilos (6 cores, 3 espessuras, tracejado), atalhos, texto editável, seleção.
- **Codex C6 — `src/lib/geometry/shapes.ts`** · sol / medium
  Modelo discriminado dos objetos de desenho (Zod), `hitTest(shape, point, tolerance)` para traço livre, seta, curva quadrática, retângulo, elipse e texto (borracha), `arrowHead(points, size)`, `defaultControlPoint(a, b)`, `simplifyPath` (Ramer–Douglas–Peucker). Testes.
- **Revisão:** `/codex:review`.

### Etapa 5 — Undo + autosave
- **Claude:** zundo num store unificado (times em campo + desenho), excluindo Esconder do histórico; Ctrl+Z/Y; autosave com debounce no `localStorage`.
- **Codex C7 — `src/lib/persistence/`** · sol / low
  Schema versionado do estado da prancheta (Zod), `serialize`/`deserialize` com fallback seguro para estado vazio em dado corrompido, `migrate(vN → vAtual)`. Testes.
- **Revisão:** `/codex:review` + `/codex:adversarial-review` focado em histórico de undo, mistura de ações e restauração do autosave (sol / xhigh).

## Paralelismo por etapa

```
Etapa N:  Claude: stub + deps ──► UI/integração ─────────────► integra C* ─► review ─► commit
          Codex:               └─► C* (background, src/lib/x) ─┘
```

As tarefas do Codex de uma mesma etapa (C2 + C3, C4 + C5) mexem em pastas disjuntas e podem rodar ao mesmo tempo.
