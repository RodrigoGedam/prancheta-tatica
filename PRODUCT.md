# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

O público principal é quem avalia portfólio: recrutadores e desenvolvedores que abrem o app para julgar a qualidade do trabalho, em geral numa visita curta, no computador e sem criar conta. O produto precisa funcionar de verdade e mostrar isso nos primeiros minutos.

## Product Purpose

A Prancheta Tática é uma prancheta de futebol de campo, 11 contra 11, na web. Ela existe para montar uma jogada e explicá-la a outra pessoa. O sucesso é o que fica na tela: dois times em campo, com formações, setas e marcações claras o bastante para que a ideia seja entendida sem explicação adicional.

## Positioning

Os 20 clubes da Série A 2026 já vêm carregados, com elenco e titulares, então o visitante chega a uma tática com times reais sem cadastro nem importação.

## Operating Context

- Uso em navegador de computador, com mouse: arrastar jogadores entre banco e campo e desenhar sobre o campo.
- Campo vertical, com o mandante embaixo e o visitante em cima.
- A prancheta atual fica salva no navegador, e desfazer e refazer valem para os gestos no campo.
- Visitantes usam os times padrão sem gravar nada no banco. Com conta, a pessoa cria times e formações privados e importa elencos por CSV.

## Capabilities and Constraints

- Desktop-only.
- Fora do escopo: confirmação de e-mail, recuperação de senha, compartilhamento, bola e cones, exportação em PNG, várias pranchetas e mobile.
- Posições válidas: `GOL, LD, ZAG, LE, VOL, MC, MEI, MD, ME, PD, PE, SA, ATA`.
- Os times padrão são somente leitura no app. Para editar, a pessoa cria uma cópia em "Meus times".
- Regras completas em `docs/especificacao.md`, que é a fonte da verdade sobre o comportamento.

## Brand Commitments

- Nome oficial: **Prancheta Tática**.
- Paleta pedida pelo dono do projeto: **bordô-noturno**.
- Voz direta, de vestiário: português do Brasil simples, com o vocabulário do futebol (titular, banco, formação), sem floreio.

## Evidence on Hand

- Elencos reais em `data/serie-a-2026/`, coletados da Wikipédia e com titulares definidos por regra, não pela escalação real.
- Não há depoimentos, clientes, métricas de uso nem imprensa. Não inventar nada disso.

## Product Principles

1. A primeira visita precisa render uma tática completa, sem cadastro.
2. O campo é o protagonista: a interface existe para deixar a jogada legível.
3. Dados reais valem mais que exemplos genéricos.
4. Cada gesto pode ser desfeito, e o trabalho não se perde ao recarregar a página.
