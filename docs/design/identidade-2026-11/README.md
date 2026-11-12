# Identidade visual — propostas de novembro de 2026

Três logos e três paletas para a Prancheta Tática, para comparar. **Nada disto foi aplicado no app**: `src/styles.css`, `public/favicon.svg` e o resto do código continuam como estavam.

Abra [`galeria.html`](galeria.html) para ver tudo lado a lado: os logos em fundo escuro, fundo claro, tamanhos pequenos e em uma cor; cada logo em cada paleta; e um mockup da prancheta (cabeçalho, campo verde com formação, banco, botões e mensagens) para cada paleta.

## Arquivos

| Caminho | O que é |
|---|---|
| `galeria.html` | Comparação visual. Documento HTML autossuficiente, UTF-8: sem rede, fontes, imagens ou scripts externos (nem internos; o seletor de logo é só CSS). |
| `resumo.html` | Apresentação compacta dos três logos e das três paletas, usada na conversa. |
| `logos/logo-0N-simbolo.svg` | Símbolo completo, para 32 px ou mais. |
| `logos/logo-0N-icone.svg` | Símbolo simplificado para 16 a 24 px (favicon, aba). |
| `logos/logo-0N-horizontal-fundo-escuro.svg` | Símbolo + nome, para fundo escuro. |
| `logos/logo-0N-horizontal-fundo-claro.svg` | Símbolo + nome, para fundo claro. |
| `logos/logo-0N-mono.svg` | Versão em uma cor (`currentColor`): os traços vazam a placa por máscara. |
| `paletas.json` | Fonte dos tokens das três paletas. |
| `gerar.mjs` | Gera os 15 SVGs e a galeria a partir do `paletas.json`. A geometria dos logos e o lettering ficam aqui. |
| `verificar.mjs` | Confere contraste, estrutura dos SVGs e regras da galeria. Sai com erro se algo falhar. |
| `contraste.mjs` | Fórmula de contraste WCAG 2.x usada pelos dois scripts. |

```bash
node docs/design/identidade-2026-11/gerar.mjs
node docs/design/identidade-2026-11/verificar.mjs            # resumo
node docs/design/identidade-2026-11/verificar.mjs --tabela   # todos os 111 pares
```

Os SVGs soltos usam as cores da paleta recomendada (Bordô & Areia). Para gerá-los em outra paleta, troque `FILE_PALETTE` no `gerar.mjs`. A galeria mostra os três logos nas três paletas.

## Nome e tipografia

O nome **PRANCHETA TÁTICA** é um lettering próprio, desenhado em vetor (traços sobre uma grade de 10 de altura, cantos em quarto de círculo, como as linhas do campo). Por isso os SVGs não dependem de fonte nenhuma e saem iguais em qualquer máquina, sem `<text>` e sem contorno a fazer. Só as dez letras do nome existem (P, R, A, Á, N, C, H, E, T, I); se um dia precisar de outra palavra no mesmo estilo, é preciso desenhar a letra no `gerar.mjs`.

A interface continua em Barlow e Barlow Condensed. O mockup da galeria usa `var(--font-sans)` com recuo para `system-ui`, porque a galeria não carrega fontes; a tipografia do mockup é aproximada.

## Os três logos

### Logo 01 · Jogada

A prancheta do treinador, com a jogada riscada: o jogador (O) sai de baixo, a seta mostra a corrida até o espaço e o marcador (X) fica para trás. O nome vem numa linha só, numa cor, e o acento fica com a seta.

- **A favor:** diz o nome do produto ("prancheta") e o que ele faz (riscar jogadas) ao mesmo tempo. A forma retangular com o prendedor é reconhecível em 16 px; o ícone tira o X e engrossa os traços.
- **Contra:** prancheta com X e O é um repertório conhecido; a força está na execução, não na ideia.

### Logo 02 · Brasão PT

Monograma P+T num escudo. A barra do T continua e vira a curva do P, desenhada como meio círculo central, com a marca do centro do campo dentro. O nome vem em duas linhas, com TÁTICA espaçada até a largura de PRANCHETA.

- **A favor:** é o mais "clube" dos três e funciona como selo; o monograma é simples e firme em tamanho pequeno.
- **Contra:** o app mostra os escudos reais dos 20 clubes da Série A, e um escudo próprio pode ser confundido com mais um time. A silhueta do escudo depende da placa bordô, que tem pouco contraste em fundo escuro (ver abaixo).

### Logo 03 · Árvore 4-3-2-1

A formação é o símbolo: os dez jogadores de linha no 4-3-2-1 (a "árvore de Natal") formam uma seta apontando para o ataque. O goleiro é um anel, e o centroavante, a ponta da seta, leva o acento. Nome numa linha, traço fino e espaçado, com TÁTICA na cor de acento.

- **A favor:** é o mais original e o mais ligado ao domínio (formações são o centro do app). Os 11 pontos contam a história inteira.
- **Contra:** onze pontos não sobrevivem a 16 px; o ícone fica com seis (1-2-3), que lê como triângulo, não como formação. O lettering fino é o menos legível dos três abaixo de 20 px de altura.

## As três paletas

Nas três, o gramado continua verde (`#2E7A46` e faixa `#2A713F`, os mesmos do app). Os nomes dos tokens seguem os do `src/styles.css` sempre que existe equivalente: `ground`, `surface`, `raised` (= `surface-2`), `line`, `edge`, `ink`, `inkSoft` (= `ink-soft`), `muted`, `action`, `actionHover`, `onAction` (= `on-accent`), `success`, `warning`, `danger`. O `accent` de hoje se divide em `focus` (anel de foco) e `highlight` (texto de destaque), e `campo.draw` é a cor de desenho sobre o gramado.

### Bordô & Areia (escuro)

Continuação direta do bordô-noturno: fundos marrom-vinho quentes, bordô nas ações, areia nos destaques e no campo, teal só no foco. O teal é o complementar do bordô e fica longe do rosé e do coral, então foco, erro e destaque não se confundem.

| Token | HEX | Papel |
|---|---|---|
| `ui.ground` | `#150B0F` | Fundo da página |
| `ui.surface` | `#1E1117` | Painéis (cabeçalho, banco) |
| `ui.raised` | `#28171F` | Cartões, selects, campos |
| `ui.line` | `#3E2631` | Divisórias decorativas (sem exigência de contraste) |
| `ui.edge` | `#8C6878` | Borda de controle (select, botão secundário) |
| `ui.ink` | `#F7EEE6` | Texto principal |
| `ui.inkSoft` | `#E2D2C6` | Texto secundário, títulos de painel |
| `ui.muted` | `#BFA99D` | Legendas, números do banco |
| `ui.action` | `#8E1B3D` | Botão principal, seleção |
| `ui.actionHover` | `#A6244B` | Botão principal em hover |
| `ui.onAction` | `#FFF4EC` | Texto e ícone sobre a ação |
| `ui.focus` | `#5CCBBE` | Anel de foco (2 px, folga de 2 px) |
| `ui.highlight` | `#E7C79A` | Texto de destaque, links |
| `ui.chip` / `ui.chipInk` | `#3A2A22` / `#E7C79A` | Chip de posição |
| `ui.success` | `#93D9A6` | Sucesso (sempre com ícone ✓) |
| `ui.warning` | `#F2C55C` | Aviso (sempre com ícone △) |
| `ui.danger` | `#FF967A` | Erro (sempre com ícone ⊗) |
| `marca.base` / `marca.mark` | `#8E1B3D` / `#FFF4EC` | Placa e traços do símbolo |
| `marca.accent` | `#E7C79A` | Acento do símbolo; goleiro do mandante |
| `marca.night` / `marca.paper` | `#150B0F` / `#F5EDE3` | Fundos escuro e claro da marca |
| `marca.word2Dark` / `marca.word2Light` | `#E7C79A` / `#8E1B3D` | 2ª palavra do nome no escuro / no claro |
| `campo.line` | `#F2F5EF` | Linhas do campo, contorno dos jogadores |
| `campo.draw` | `#F3D6A6` | Setas, desenhos e seleção no campo |

### Vermelho & Navy (escuro)

Mais esportiva e fria: navy profundo nos fundos, vermelho vivo nas ações e azul-gelo no foco e nos destaques. É a de maior impacto, e também a mais "genérica de esporte".

| Token | HEX | Papel |
|---|---|---|
| `ui.ground` | `#0B1120` | Fundo da página |
| `ui.surface` | `#111A2E` | Painéis (cabeçalho, banco) |
| `ui.raised` | `#18233B` | Cartões, selects, campos |
| `ui.line` | `#26344F` | Divisórias decorativas |
| `ui.edge` | `#61779C` | Borda de controle |
| `ui.ink` | `#EEF3F9` | Texto principal |
| `ui.inkSoft` | `#CAD6E4` | Texto secundário |
| `ui.muted` | `#9DB0C8` | Legendas |
| `ui.action` | `#C8102E` | Botão principal, seleção |
| `ui.actionHover` | `#A80D27` | Hover (escurece: clarear o vermelho derrubaria o contraste do branco) |
| `ui.onAction` | `#FFFFFF` | Texto sobre a ação |
| `ui.focus` | `#9FD8F7` | Anel de foco |
| `ui.highlight` | `#BFE6FA` | Texto de destaque |
| `ui.chip` / `ui.chipInk` | `#22304D` / `#BFE6FA` | Chip de posição |
| `ui.success` | `#7FD9A8` | Sucesso, com ícone |
| `ui.warning` | `#F7CC5E` | Aviso, com ícone |
| `ui.danger` | `#FF9B73` | Erro, com ícone (coral, para não competir com o vermelho da ação) |
| `marca.base` / `marca.mark` | `#C8102E` / `#FFFFFF` | Placa e traços do símbolo |
| `marca.accent` | `#9FD8F7` | Acento do símbolo; goleiro do mandante |
| `marca.night` / `marca.paper` | `#0B1120` / `#F2F6FA` | Fundos da marca |
| `marca.word2Dark` / `marca.word2Light` | `#FF8C94` / `#B30F2A` | 2ª palavra do nome |
| `campo.line` | `#F2F5EF` | Linhas e contorno dos jogadores |
| `campo.draw` | `#CFEFFF` | Setas e seleção no campo |

### Carmim, Grafite & Ouro (escuro)

A mais sóbria e neutra: fundos grafite sem matiz (nem vinho nem navy), carmim profundo nas ações, ouro-velho nos destaques, no acento da marca e no goleiro, e verde-sálvia dessaturado só no foco. Lembra camisa de clube com escudo dourado. Como os fundos não puxam para nenhuma cor, o carmim e o ouro aparecem mais, e o campo verde fica sem concorrência.

| Token | HEX | Papel |
|---|---|---|
| `ui.ground` | `#111214` | Fundo da página |
| `ui.surface` | `#18191C` | Painéis (cabeçalho, banco) |
| `ui.raised` | `#212226` | Cartões, selects, campos |
| `ui.line` | `#34363B` | Divisórias decorativas |
| `ui.edge` | `#7C7F87` | Borda de controle |
| `ui.ink` | `#F3F1EC` | Texto principal |
| `ui.inkSoft` | `#D8D5CF` | Texto secundário |
| `ui.muted` | `#ACA9A2` | Legendas |
| `ui.action` | `#A0182F` | Botão principal, seleção |
| `ui.actionHover` | `#B81F38` | Hover (clareia um pouco; o texto claro ainda passa com folga) |
| `ui.onAction` | `#FFF6F0` | Texto sobre a ação |
| `ui.focus` | `#A9BF8E` | Anel de foco (sálvia, longe do carmim e do ouro) |
| `ui.highlight` | `#DDA94B` | Texto de destaque, links (ouro-velho) |
| `ui.chip` / `ui.chipInk` | `#2E2717` / `#DDA94B` | Chip de posição |
| `ui.success` | `#7FD6A0` | Sucesso, com ícone (menta, mais saturado que o foco) |
| `ui.warning` | `#F2D45C` | Aviso, com ícone (amarelo, mais claro que o ouro) |
| `ui.danger` | `#FF9580` | Erro, com ícone (coral, para não competir com o carmim) |
| `marca.base` / `marca.mark` | `#A0182F` / `#FFF6F0` | Placa e traços do símbolo |
| `marca.accent` | `#DDA94B` | Acento do símbolo; goleiro do mandante |
| `marca.night` / `marca.paper` | `#111214` / `#F3F1EC` | Fundos da marca |
| `marca.word2Dark` / `marca.word2Light` | `#DDA94B` / `#A0182F` | 2ª palavra do nome |
| `campo.line` | `#F2F5EF` | Linhas e contorno dos jogadores |
| `campo.draw` | `#F5D08A` | Setas e seleção no campo |

## Contraste medido

O `verificar.mjs` mede 37 pares por paleta (111 no total) com a fórmula WCAG 2.x e falha abaixo do mínimo: **4,5:1** para texto (inclusive o nome no logo, o texto dos chips, dos botões e dos números dos jogadores) e **3:1** para foco, bordas de controle, traços do símbolo, linhas e desenhos no campo. Resultado da última execução: **todos passam**.

| Par | Bordô & Areia | Vermelho & Navy | Carmim, Grafite & Ouro | Mín. |
|---|---|---|---|---|
| Texto / painel | 15,97 | 15,54 | 15,57 | 4,5 |
| Legenda / cartão | 7,61 | 7,06 | 6,77 | 4,5 |
| Texto no botão principal | 8,17 | 5,88 | 7,39 | 4,5 |
| Texto no botão em hover | 6,52 | 7,63 | 5,98 | 4,5 |
| Destaque / painel | 11,36 | 13,14 | 8,25 | 4,5 |
| Erro / painel | 8,62 | 8,41 | 8,26 | 4,5 |
| 2ª palavra do nome no escuro | 11,99 | 8,46 | 8,79 | 4,5 |
| 2ª palavra do nome no claro | 7,63 | 6,41 | 6,98 | 4,5 |
| Foco / painel | 9,36 | 11,26 | 8,81 | 3 |
| Borda de controle / cartão | 3,54 | 3,45 | 3,97 | 3 |
| Seta / gramado | 3,76 | 4,37 | 3,58 | 3 |
| Linhas e contorno / gramado | 4,78 | 4,78 | 4,78 | 3 |
| Acento / placa do logo | 5,49 | 3,82 | 3,69 | 3 |
| **Pior caso de texto** | 6,52 | 5,88 | 5,98 | 4,5 |
| **Pior caso de UI** | 3,54 | 3,45 | 3,58 | 3 |

Pares medidos que **não** entram na regra, de propósito:

- **Botão principal contra o fundo:** 2,07 (Bordô & Areia), 2,95 (Navy), 2,38 (Carmim). O botão é identificado pelo rótulo, que passa com folga, e o anel de foco fica sobre o fundo, não sobre o botão.
- **Jogador vermelho contra o gramado:** 1,68, 1,12 e 1,50. Vermelho e verde quase não se separam por luminosidade, e para quem tem daltonismo vermelho-verde somem. Por isso os jogadores do mockup têm **contorno claro** (4,78:1 contra o gramado). Vale levar para o app em qualquer paleta, já que a cor de cada time é livre.
- **Placa do símbolo contra o fundo escuro da marca:** 2,18, 3,20 e 2,38. Os traços claros do símbolo (5,9 a 8,2:1 sobre a placa) é que carregam a leitura. Isso pesa mais no logo 02, cuja silhueta de escudo some um pouco no escuro.
- **Divisórias (`ui.line`):** decorativas; nenhum controle depende delas.

## Estado sem depender só de cor

- Mensagens de sucesso, aviso e erro têm ícone próprio (✓, triângulo, círculo com X) e texto.
- O botão principal mostra hover com outra cor **e** a galeria rotula o estado; o foco é um anel de 2 px com folga de 2 px, que muda a forma, não só a cor.
- A seleção no campo é um anel tracejado; o goleiro do mandante tem outra cor, como no app (`contrastColor`).
- No logo 03, o goleiro é anel e os outros são pontos: a diferença está na forma.

## Recomendação: logo 01 (Jogada) com Bordô & Areia

**Logo 01**, porque é o único que diz o nome e a função do produto ao mesmo tempo, e o produto é exatamente isso: uma prancheta para riscar jogadas. Ele aguenta 16 px (o 03 não aguenta), não se confunde com os escudos dos clubes que o app já mostra (o 02 se confunde) e o nome numa linha, em traço médio, é o mais legível no cabeçalho. O 03 é a ideia mais original e pode render um ícone de seção ou uma ilustração de carregamento.

**Bordô & Areia**, porque mantém o compromisso do `PRODUCT.md` (paleta bordô-noturno, tema escuro) e resolve o que a paleta atual tem de mais frágil: hoje o rosé de destaque, o coral de erro e o bordô são todos da mesma família, e na proposta o foco vai para o teal (complementar do bordô), o destaque e os desenhos no campo vão para a areia, e o erro continua coral. O escuro também favorece o campo verde, que é o protagonista. A Vermelho & Navy tem mais impacto, mas é o visual mais comum em produtos de esporte; a Carmim, Grafite & Ouro é a mais sóbria e a que deixa o campo verde mais em evidência, mas abandona o fundo bordô-noturno que o `PRODUCT.md` descreve.

Se o Rodrigo aprovar, a aplicação seria: trocar os valores em `src/styles.css` (mapeamento de nomes acima), substituir `public/favicon.svg` por `logos/logo-01-icone.svg` e pôr `logos/logo-01-horizontal-fundo-escuro.svg` no cabeçalho.

## Limitações

- **Revisão visual pelo integrador:** apresentação compacta renderizada integralmente em 728 px, sem erros no console; galeria completa renderizada com 5.131 px de conteúdo (a captura da ferramenta mostra os primeiros 4.000 px). Ajustado o contraste do texto externo ao tema do T3 e incluídos documento HTML e metadados UTF-8. Não foi um teste de interação do app ou de todas as larguras.
- O seletor de logo nos mockups usa `:has()`. Num navegador sem suporte, os mockups ficam sempre com o logo 01; o resto da galeria não depende dele.
- O lettering tem só as letras do nome. Não há versão vertical (símbolo em cima do nome) nem versão com fundo para redes sociais.
- O contraste do mockup do campo considera o gramado liso; sobre as faixas os números são um pouco melhores (medidos também).
- As cores da galeria fora das amostras vêm do tema de quem exibe (`--foreground`, `--muted-foreground`, `--card`, `--border`, `--font-sans`), com recuo para cores do sistema e mistura do texto principal.
