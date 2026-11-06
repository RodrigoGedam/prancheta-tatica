# Times padrão: Série A 2026

Elencos dos 20 clubes carregados por padrão no banco. Os CSVs desta pasta são a fonte da verdade: `pnpm squads:seed` lê daqui e não acessa a internet.

## Origem dos dados

Dados coletados da Wikipédia em 06/11/2026 (textos sob licença [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)). A data de cada elenco está em `manifest.json`.

- **Com `wiki` em `clubs.json`:** tabela de elenco da [Wikipédia em português](https://pt.wikipedia.org), baixada com `pnpm squads:fetch`.
- **Com `wiki: null`:** a Wikipédia em português estava desatualizada ou sem posições. Número e nome vêm da [Wikipédia em inglês](https://en.wikipedia.org). A posição vem, nesta ordem, da tabela em português, da introdução da página do jogador em inglês ou de pesquisa manual. Esses CSVs são mantidos à mão: a coleta não os altera.

## Limitações

- O elenco é uma foto da data da fonte e não se atualiza sozinho.
- A fonte não informa os titulares: são os menores números de cada posição em um 4-3-3, não a escalação real.
- `MC` e `ATA` são genéricos: a fonte não distingue meia de armador nem ponta de centroavante. Nos clubes com `wiki: null`, volantes sem essa descrição na página do jogador ficam como `MC`.
- Marcelinho (Mirassol) está como `ZAG` por estimativa: as fontes só dizem "defensor".

## Como atualizar

1. `pnpm squads:fetch` baixa os clubes com `wiki` que ainda não foram revisados. Use `--only=<slug>` para um clube e `--overwrite` para substituir um já revisado.
2. Revise os CSVs e o relatório, e marque `reviewed: true` em `manifest.json`.
3. `pnpm squads:seed` simula a carga. `--apply` grava no Supabase e `--force` substitui times que já existem, inclusive edições feitas no app.

Em uma nova temporada, crie outra pasta de dados e atualize `DATA_DIR` em `scripts/squad-data.ts`. A carga não remove times rebaixados.
