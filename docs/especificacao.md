# Especificação — Campinho

Acordada em 2026-11-04. Stack e convenções em [`../AGENTS.md`](../AGENTS.md).

## 1. Importação de CSV

- Um arquivo por time. Separador `;`.
- Colunas: `nome;numero;posicao;apelido;titular` (`titular` = `S`/`N`). Obrigatórias: `nome` e `posicao`.
- Nome e cor do time são definidos no diálogo de importação (não vêm do CSV).
- `posicao` vem de uma lista fixa: `GOL, LD, ZAG, LE, VOL, MC, MEI, MD, ME, PD, PE, SA, ATA`. Um valor desconhecido gera **aviso** (não erro).
- Prévia antes de salvar, com erros e avisos por linha.
- Detectar a codificação: UTF-8 ou Windows-1252.
- Reimportar um time com o mesmo nome **substitui** os jogadores, após confirmação.
- Sem a coluna `titular`, os 11 primeiros são titulares, com um só goleiro.
- Limite de titulares (ver Dados): com a coluna `titular`, o excedente vira reserva, com aviso na prévia.

## 2. Dados (Supabase)

- Projeto na nuvem, região `sa-east-1` (ainda não criado).
- Tabelas: `teams`, `players`, `formations` (só as customizadas).
- Anon key + RLS permissiva, sem Auth.
- A prancheta atual fica no `localStorage` (não existe tabela de pranchetas).

### Regras do time

- **Formação padrão:** cada time tem uma (fixa ou customizada), escolhida ao criar ou editar; o padrão é 4-3-3. Ao selecionar o time na prancheta, o lado assume essa formação. Formação custom excluída equivale a 4-3-3.
- **Titulares:** no máximo 11 por time, com um só goleiro, mesmo com menos de 11. Para trocar, é preciso tirar um titular antes. O banco de dados também garante a regra.

### Times padrão

- Os 20 clubes da Série A 2026 já vêm no banco, carregados de `data/serie-a-2026/` por `pnpm squads:seed`.
- São editáveis e excluíveis como qualquer time. Importar um CSV com o mesmo nome substitui o elenco, com a confirmação de sempre.
- Repetir a carga não altera times que já existem, salvo com `--force`.

## 3. Rotas

- `/`: prancheta.
- `/times`: CRUD de times, tabela de jogadores e importação (a importação também abre a partir da prancheta).
- Tabela de jogadores: titulares sempre primeiro. Ao abrir um time, ordena por posição, na ordem da lista de posições. Clicar em Nº, Nome ou Posição ordena por essa coluna dentro de titulares e de reservas; clicar de novo inverte.

## 4. Prancheta

- Campo vertical 105×68, só desktop.
- Mandante embaixo, visitante em cima. Seletores de time no topo; o mesmo time não pode estar dos dois lados.
- Formação por time; trocar a formação reposiciona os jogadores.
- Banco em painel lateral por time. Arraste livre, sem limite de jogadores em campo.
- Soltar um jogador em cima de outro = **empilhar** (sem troca; se der muitos bugs, mudar para troca).
- Soltar fora do campo e do banco: o jogador volta ao lugar.
- Botões por time:
  - **Esconder**: o painel do banco recolhe e as posições são preservadas.
  - **Resetar**.
- Token: círculo na cor do time + número (ou iniciais, se não houver número) + apelido (ou nome). O goleiro usa uma cor de contraste automática. Tooltip ao passar o mouse.
- Aviso de cores parecidas entre os dois times, com uma cor alternativa que vale só na prancheta.

## 5. Formações

- Fixas: 4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2.
- Customizadas: exigem exatamente 11 em campo; guardam slot + posição; são espelhadas para o time de cima; podem ser renomeadas e excluídas.

## 6. Desenho

- Ferramentas: livre, flecha, flecha curva (com ponto de controle), retângulo, círculo (contorno + 20% de preenchimento), texto, borracha (apaga o objeto inteiro), selecionar.
- Tracejado é uma opção de estilo. 6 cores, 3 espessuras.
- Camada própria, independente dos times.
- Jogadores só são arrastáveis com a ferramenta Selecionar.
- Atalhos: `V` selecionar, `P` livre, `A` flecha, `C` curva, `R` retângulo, `O` círculo, `T` texto, `E` borracha, `D` tracejado, `Esc`, `Delete`, `Ctrl+Z`/`Ctrl+Y`.
- Um único histórico de undo para tudo (Esconder não entra no histórico).

## 7. Etapas

Um commit por etapa, cada uma com testes Vitest:

1. Scaffold + campo
2. Supabase + times + CSV
3. Formações + banco
4. Desenho
5. Undo + autosave

Rodar localmente com `.env.local`; deploy na Vercel depois.
