// Gera os SVGs dos logos (logos/*.svg) e a galeria (galeria.html) a partir de paletas.json.
// Uso: node docs/design/identidade-2026-11/gerar.mjs   (sem dependências)
// A geometria dos logos e o lettering vivem aqui; edite aqui e gere de novo.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast } from './contraste.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { paletas } = JSON.parse(readFileSync(join(here, 'paletas.json'), 'utf8'));
const byId = Object.fromEntries(paletas.map((p) => [p.id, p]));
/** Paleta usada nos SVGs soltos (a recomendada). A galeria mostra as três. */
const FILE_PALETTE = byId.p1;

const r = (n) => Math.round(n * 100) / 100;
/** Cor como atributo; var(--x) só funciona em style. */
const paint = (prop, v) => (v.startsWith('var(') ? `style="${prop}:${v}"` : `${prop}="${v}"`);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Lettering: maiúsculas condensadas desenhadas como traço sobre uma grade de 10 de altura.
// Cantos em quarto de círculo (raio 2), como as linhas do campo. Só as letras do nome.
const A = 'M0 10V2A2 2 0 0 1 2 0H4A2 2 0 0 1 6 2V10M0 5.5H6';
const GLYPHS = {
  P: { w: 6, d: 'M0 10V0H4A2 2 0 0 1 6 2V3A2 2 0 0 1 4 5H0' },
  R: { w: 6, d: 'M0 10V0H4A2 2 0 0 1 6 2V3A2 2 0 0 1 4 5H0M4 5A2 2 0 0 1 6 7V10' },
  A: { w: 6, d: A },
  Á: { w: 6, d: `${A}M2.6 -2.8L4.4 -4.4` },
  N: { w: 6, d: 'M0 10V0L6 10V0' },
  C: { w: 6, d: 'M6 0H2A2 2 0 0 0 0 2V8A2 2 0 0 0 2 10H6' },
  H: { w: 6, d: 'M0 0V10M6 0V10M0 5H6' },
  E: { w: 5, d: 'M5 0H0V10H5M0 5H4' },
  T: { w: 6, d: 'M0 0H6M3 0V10' },
  I: { w: 0, d: 'M0 0V10' },
};

/** Kerning: o T deixa um vão embaixo do braço. */
const KERN = { TA: -1, TÁ: -1, AT: -0.6, ÁT: -0.6, ET: -0.4 };
const kern = (text, i) => KERN[text.slice(i, i + 2)] ?? 0;

/** Largura visual de uma palavra (inclui a sobra do traço), em unidades da grade. */
function wordWidth(text, s, track) {
  const chars = [...text];
  const ws = chars.map((ch) => GLYPHS[ch].w);
  const kerning = chars.slice(0, -1).reduce((a, _, i) => a + kern(text, i), 0);
  return ws.reduce((a, b) => a + b, 0) + ws.length * s + (ws.length - 1) * track + kerning;
}

/** Uma palavra como grupo de traços. x/y = canto superior esquerdo da caixa alta. */
function word(text, { x, y, k, s, track, color }) {
  let cx = s / 2;
  const parts = [];
  [...text].forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`letra sem desenho: ${ch}`);
    parts.push(`<path transform="translate(${r(cx)} 0)" d="${g.d}"/>`);
    cx += g.w + s + track + kern(text, i);
  });
  const svg =
    `<g transform="translate(${r(x)} ${r(y)}) scale(${k})" fill="none" ${paint('stroke', color)}` +
    ` stroke-width="${s}" stroke-linecap="square" stroke-miterlimit="2">${parts.join('')}</g>`;
  return { svg, width: wordWidth(text, s, track) * k };
}

// ---------------------------------------------------------------------------
// Logos. Cada símbolo é uma placa (base) + traços (mark/accent) numa grade 48×48.
// O mono usa máscara: os traços vazam a placa, então funciona em uma cor só.
const stroke = (c, w, extra = '') => `fill="none" ${paint('stroke', c)} stroke-width="${w}" ${extra}`;
const ROUND = 'stroke-linecap="round" stroke-linejoin="round"';

const LOGOS = [
  {
    n: '01',
    nome: 'Jogada',
    conceito:
      'A prancheta do treinador com a jogada riscada: o jogador (O) corre e a seta mostra o caminho até o espaço, com o marcador (X) para trás.',
    plate: (f) => `<rect x="8" y="4" width="32" height="41" rx="5" ${f}/>`,
    marks: (c) =>
      `<rect x="18" y="7.5" width="12" height="4.5" rx="2.25" ${paint('fill', c.mark)}/>` +
      `<circle cx="16.5" cy="34.5" r="3.6" ${stroke(c.mark, 2.6)}/>` +
      `<path d="M27.5 31L33 36.5M33 31L27.5 36.5" ${stroke(c.mark, 2.6, ROUND)}/>` +
      `<path d="M16.5 27.6C16.5 21.6 21 18.5 31 18.5M27.5 14.5L32 18.5L27.5 22.5" ${stroke(c.accent, 2.6, ROUND)}/>`,
    iconMarks: (c) =>
      `<rect x="17" y="7" width="14" height="5" rx="2.5" ${paint('fill', c.mark)}/>` +
      `<circle cx="16.5" cy="35" r="4.2" ${stroke(c.mark, 3.6)}/>` +
      `<path d="M16.5 26.6C16.5 20.8 21 17.5 30 17.5M25.5 12.5L31.5 17.5L25.5 22.5" ${stroke(c.accent, 3.6, ROUND)}/>`,
    lockup(c) {
      const o = { k: 1.45, s: 1.8, track: 1.2, y: 24 - 5 * 1.45 };
      const w1 = word('PRANCHETA', { ...o, x: 59, color: c.w1 });
      const w2 = word('TÁTICA', { ...o, x: 59 + w1.width + 4.2 * o.k, color: c.w1 });
      return { body: w1.svg + w2.svg, width: 59 + w1.width + 4.2 * o.k + w2.width + 1.5 };
    },
  },
  {
    n: '02',
    nome: 'Brasão PT',
    conceito:
      'Monograma P+T num escudo de clube. A barra do T é a linha que vira a curva do P, desenhada como meio círculo central, com a marca do centro do campo dentro.',
    plate: (f) => `<path d="M8 5H40V23.5C40 33.5 33.5 40 24 44.5C14.5 40 8 33.5 8 23.5Z" ${f}/>`,
    marks: (c) =>
      `<path d="M12.5 13H28A6 6 0 0 1 28 25H22M22 13V37" ${stroke(c.mark, 3.4, 'stroke-linejoin="miter"')}/>` +
      `<circle cx="28" cy="19" r="2" ${paint('fill', c.accent)}/>`,
    iconMarks: (c) =>
      `<path d="M12 13H28A6 6 0 0 1 28 25H21.5M21.5 13V37" ${stroke(c.mark, 4.4, 'stroke-linejoin="miter"')}/>` +
      `<circle cx="28" cy="19" r="2.2" ${paint('fill', c.accent)}/>`,
    lockup(c) {
      const s = 1.9;
      const k = 1.15;
      const l1 = word('PRANCHETA', { k, s, track: 1.2, x: 58, y: 8.5, color: c.w1 });
      // TÁTICA justificada na largura de PRANCHETA.
      const base = wordWidth('TÁTICA', s, 0);
      const track = (l1.width / k - base) / 5;
      const l2 = word('TÁTICA', { k, s, track, x: 58, y: 29, color: c.w2 });
      return { body: l1.svg + l2.svg, width: 58 + l1.width + 1.5 };
    },
  },
  {
    n: '03',
    nome: 'Árvore 4-3-2-1',
    conceito:
      'A formação vira o símbolo: os dez jogadores de linha no 4-3-2-1 ("árvore de Natal") formam uma seta para o ataque, com o goleiro em anel e o centroavante em destaque.',
    plate: (f) => `<rect x="9" y="3" width="30" height="42" rx="5" ${f}/>`,
    marks(c) {
      const rows = [
        [33, [13.5, 20.5, 27.5, 34.5]],
        [25.5, [17, 24, 31]],
        [18, [20.5, 27.5]],
      ];
      const dots = rows
        .flatMap(([y, xs]) => xs.map((x) => `<circle cx="${x}" cy="${y}" r="2.5" ${paint('fill', c.mark)}/>`))
        .join('');
      return (
        dots +
        `<circle cx="24" cy="10.5" r="2.7" ${paint('fill', c.accent)}/>` +
        `<circle cx="24" cy="40.5" r="2.1" ${stroke(c.mark, 1.4)}/>`
      );
    },
    iconMarks: (c) =>
      [
        [19, 24.5],
        [29, 24.5],
        [14, 35.5],
        [24, 35.5],
        [34, 35.5],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.8" ${paint('fill', c.mark)}/>`)
        .join('') + `<circle cx="24" cy="13.5" r="4" ${paint('fill', c.accent)}/>`,
    lockup(c) {
      const o = { k: 1.3, s: 1.2, track: 2.3, y: 24 - 5 * 1.3 };
      const w1 = word('PRANCHETA', { ...o, x: 57, color: c.w1 });
      const w2 = word('TÁTICA', { ...o, x: 57 + w1.width + 5 * o.k, color: c.w2 });
      return { body: w1.svg + w2.svg, width: 57 + w1.width + 5 * o.k + w2.width + 1.5 };
    },
  },
];

let uidCounter = 0;
function symbolBody(logo, c, { icon = false, mono = false } = {}) {
  const marks = icon ? logo.iconMarks : logo.marks;
  if (!mono) return logo.plate(paint('fill', c.base)) + marks(c);
  const id = `pt-mask-${logo.n}-${++uidCounter}`;
  return (
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">` +
    `${logo.plate('fill="#fff"')}${marks({ mark: '#000', accent: '#000' })}</mask>` +
    logo.plate(`${paint('fill', c.mono)} mask="url(#${id})"`)
  );
}

function svgDoc({ viewBox, width, height, label, body, cls = '', standalone = false }) {
  const size = width ? ` width="${r(width)}" height="${r(height)}"` : '';
  const klass = cls ? ` class="${cls}"` : '';
  const head = standalone ? '' : ` role="img" aria-label="${esc(label)}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size}${klass}${head}><title>${esc(label)}</title>${body}</svg>`;
}

function symbolSvg(logo, c, opts = {}) {
  const label = `${opts.icon ? 'Ícone' : 'Símbolo'} ${logo.n} da Prancheta Tática (${logo.nome})`;
  return svgDoc({ viewBox: '0 0 48 48', label, body: symbolBody(logo, c, opts), ...opts.svg });
}

function lockupSvg(logo, c, opts = {}) {
  const words = logo.lockup(opts.mono ? { w1: c.mono, w2: c.mono } : c);
  const body = symbolBody(logo, c, opts) + words.body;
  return svgDoc({ viewBox: `0 0 ${r(words.width)} 48`, label: 'Prancheta Tática', body, ...opts.svg });
}

// ---------------------------------------------------------------------------
// Arquivos soltos (na paleta recomendada).
const logoDir = join(here, 'logos');
mkdirSync(logoDir, { recursive: true });
const fileColors = (p, light) => ({
  base: p.marca.base,
  mark: p.marca.mark,
  accent: p.marca.accent,
  w1: light ? p.marca.wordLight : p.marca.wordDark,
  w2: light ? p.marca.word2Light : p.marca.word2Dark,
  mono: 'currentColor',
});
const write = (name, svg) => writeFileSync(join(logoDir, name), `${svg}\n`, 'utf8');
for (const logo of LOGOS) {
  const dark = fileColors(FILE_PALETTE, false);
  const light = fileColors(FILE_PALETTE, true);
  const big = (w, h) => ({ standalone: true, width: w, height: h });
  write(`logo-${logo.n}-simbolo.svg`, symbolSvg(logo, dark, { svg: big(96, 96) }));
  write(`logo-${logo.n}-icone.svg`, symbolSvg(logo, dark, { icon: true, svg: big(32, 32) }));
  const wDark = logo.lockup(dark).width;
  write(`logo-${logo.n}-horizontal-fundo-escuro.svg`, lockupSvg(logo, dark, { svg: big(wDark * 2, 96) }));
  write(`logo-${logo.n}-horizontal-fundo-claro.svg`, lockupSvg(logo, light, { svg: big(wDark * 2, 96) }));
  write(`logo-${logo.n}-mono.svg`, lockupSvg(logo, dark, { mono: true, svg: big(wDark * 2, 96) }));
}

// ---------------------------------------------------------------------------
// Galeria. Os logos usam variáveis CSS para trocar de paleta; os mockups têm cores fixas.
const VARS = {
  base: 'var(--lg-base)',
  mark: 'var(--lg-mark)',
  accent: 'var(--lg-accent)',
  w1: 'var(--lg-w1)',
  w2: 'var(--lg-w2)',
  mono: 'currentColor',
};
const inSymbol = (logo, opts = {}) => symbolSvg(logo, VARS, { ...opts, svg: { cls: opts.cls ?? 'pt-sym' } });
const inLockup = (logo, opts = {}) => lockupSvg(logo, VARS, { ...opts, svg: { cls: opts.cls ?? 'pt-lock' } });

function paletteCss(p) {
  const ui = Object.entries(p.ui).map(([k, v]) => `--m-${k}:${v}`).join(';');
  const m = p.marca;
  return [
    `.pt-gal .${p.id}{${ui};--lg-base:${m.base};--lg-mark:${m.mark};--lg-accent:${m.accent}}`,
    `.pt-gal .${p.id}.pt-dark{--lg-bg:${m.night};--lg-w1:${m.wordDark};--lg-w2:${m.word2Dark}}`,
    `.pt-gal .${p.id}.pt-light{--lg-bg:${m.paper};--lg-w1:${m.wordLight};--lg-w2:${m.word2Light}}`,
  ].join('\n');
}

// Campo do mockup, em metros (68 × 105), mandante embaixo no 4-3-3 e visitante em cima no 4-4-2.
const HOME = [[34, 99], [58, 85], [43, 86], [25, 86], [10, 85], [51, 71], [34, 70], [17, 71], [56, 58], [34, 57], [12, 58]];
const AWAY = [[34, 6], [10, 20], [25, 19], [43, 19], [58, 20], [10, 34], [25, 33], [43, 33], [58, 34], [26, 45], [42, 45]];

function arrowHead([cx, cy], [ex, ey], len, half) {
  const L = Math.hypot(ex - cx, ey - cy);
  const [dx, dy] = [(ex - cx) / L, (ey - cy) / L];
  const tip = [ex + dx * len, ey + dy * len];
  const a = [ex - dy * half, ey + dx * half];
  const b = [ex + dy * half, ey - dx * half];
  return [tip, a, b].map((pt) => pt.map(r).join(' ')).join(' ');
}

function pitchSvg(p) {
  const f = p.campo;
  const stripes = Array.from({ length: 5 }, (_, i) => `<rect x="-3" y="${r(i * 21 + 10.5)}" width="74" height="10.5" fill="${f.stripe}"/>`).join('');
  const lines =
    `<g fill="none" stroke="${f.line}" stroke-width="0.5">` +
    `<rect x="0" y="0" width="68" height="105"/><path d="M0 52.5H68"/><circle cx="34" cy="52.5" r="9.15"/>` +
    `<rect x="13.84" y="0" width="40.32" height="16.5"/><rect x="24.84" y="0" width="18.32" height="5.5"/>` +
    `<rect x="13.84" y="88.5" width="40.32" height="16.5"/><rect x="24.84" y="99.5" width="18.32" height="5.5"/>` +
    `<path d="M26.69 16.5A9.15 9.15 0 0 0 41.31 16.5M26.69 88.5A9.15 9.15 0 0 1 41.31 88.5"/></g>` +
    `<g fill="${f.line}"><circle cx="34" cy="11" r="0.45"/><circle cx="34" cy="94" r="0.45"/><circle cx="34" cy="52.5" r="0.45"/></g>`;
  const token = ([x, y], i, fill, ink, edge) =>
    `<circle cx="${x}" cy="${y}" r="3.2" fill="${fill}"${edge ? ` stroke="${edge}" stroke-width="0.7"` : ''}/>` +
    `<text x="${x}" y="${r(y + 1.2)}" fill="${ink}">${i + 1}</text>`;
  const home = HOME.map((pt, i) =>
    i === 0
      ? token(pt, i, p.marca.accent, f.awayInk, f.tokenEdge)
      : token(pt, i, p.ui.action, p.ui.onAction, f.tokenEdge),
  ).join('');
  const away = AWAY.map((pt, i) => (i === 0 ? token(pt, i, f.awayInk, f.away, f.tokenEdge) : token(pt, i, f.away, f.awayInk))).join('');
  const draw =
    `<path d="M56 54Q63 47 58.5 38.5" fill="none" stroke="${f.draw}" stroke-width="0.9" stroke-linecap="round"/>` +
    `<polygon points="${arrowHead([63, 47], [58.5, 38.5], 2.6, 1.7)}" fill="${f.draw}"/>` +
    `<path d="M60 81L63 67" fill="none" stroke="${f.draw}" stroke-width="0.9" stroke-dasharray="1.6 1.2"/>` +
    `<polygon points="${arrowHead([60, 81], [63, 67], 2.6, 1.7)}" fill="${f.draw}"/>` +
    `<circle cx="34" cy="70" r="5" fill="none" stroke="${f.draw}" stroke-width="0.6" stroke-dasharray="1.4 1"/>`;
  return (
    `<svg class="pt-pitch" viewBox="-3 -3 74 111" role="img" aria-label="Campo com mandante no 4-3-3 e visitante no 4-4-2, duas setas desenhadas e um jogador selecionado">` +
    `<rect x="-3" y="-3" width="74" height="111" fill="${f.pitch}"/>${stripes}${lines}${away}${home}${draw}</svg>`
  );
}

const ICON = {
  ok: '<path d="M2.5 7.5L5.5 10.5L11.5 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  warn: '<path d="M7 1.8L12.8 12H1.2Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 5.5V8.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="7" cy="10.2" r="0.85" fill="currentColor"/>',
  err: '<circle cx="7" cy="7" r="5.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4.9 4.9L9.1 9.1M9.1 4.9L4.9 9.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  chevron: '<path d="M3.5 5.5L7 9L10.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
};
const icon = (name) => `<svg class="pt-ico" viewBox="0 0 14 14" aria-hidden="true">${ICON[name]}</svg>`;

function mockup(p) {
  // As três paletas são escuras: o logo do cabeçalho do mockup usa sempre as cores de fundo escuro.
  const theme = 'pt-dark';
  const logos = LOGOS.map((l) => `<span class="pt-mk-logo" data-l="${l.n}">${inLockup(l, { cls: 'pt-mk-lock' })}</span>`).join('');
  const bench = [
    ['GOL', 'Reserva', 12],
    ['ZAG', 'Reserva', 14],
    ['MEI', 'Reserva', 18],
  ]
    .map(([pos, name, n]) => `<div class="pt-bench"><span class="pt-chip">${pos}</span><span>${name}</span><span class="pt-n">${n}</span></div>`)
    .join('');
  return `<div class="pt-mock ${p.id} ${theme}">
  <div class="pt-mhead">${logos}<span class="pt-sp"></span>
    <span class="pt-sel"><span class="pt-sel-k">Mandante</span> 4-3-3 ${icon('chevron')}</span>
    <span class="pt-sel"><span class="pt-sel-k">Visitante</span> 4-4-2 ${icon('chevron')}</span>
    <span class="pt-ghost">Entrar</span>
  </div>
  <div class="pt-mbody">
    ${pitchSvg(p)}
    <div class="pt-side">
      <div class="pt-side-t">Banco do mandante</div>
      ${bench}
      <span class="pt-btn">Salvar como formação</span>
      <div class="pt-states"><span class="pt-btn">Normal</span><span class="pt-btn is-hover">Hover</span><span class="pt-btn is-focus">Foco</span></div>
      <span class="pt-btn2">Resetar</span>
      <div class="pt-msg pt-ok">${icon('ok')}Salvo no navegador</div>
      <div class="pt-msg pt-warn">${icon('warn')}Cores parecidas</div>
      <div class="pt-msg pt-err">${icon('err')}2 linhas do CSV com erro</div>
    </div>
  </div>
</div>`;
}

const SWATCHES = [
  ['ui.ground', 'Fundo'],
  ['ui.surface', 'Painel'],
  ['ui.raised', 'Cartão / controle'],
  ['ui.line', 'Divisória'],
  ['ui.edge', 'Borda de controle'],
  ['ui.ink', 'Texto'],
  ['ui.muted', 'Legenda'],
  ['ui.action', 'Ação'],
  ['ui.actionHover', 'Ação · hover'],
  ['ui.onAction', 'Texto na ação'],
  ['ui.focus', 'Foco'],
  ['ui.highlight', 'Destaque'],
  ['ui.chip', 'Chip de posição'],
  ['ui.success', 'Sucesso'],
  ['ui.warning', 'Aviso'],
  ['ui.danger', 'Erro'],
  ['marca.accent', 'Acento da marca'],
  ['campo.draw', 'Desenho no campo'],
];
const KEY_PAIRS = [
  ['ui.ink', 'ui.surface', 4.5, 'Texto / painel'],
  ['ui.muted', 'ui.raised', 4.5, 'Legenda / cartão'],
  ['ui.onAction', 'ui.action', 4.5, 'Botão principal'],
  ['ui.highlight', 'ui.surface', 4.5, 'Destaque / painel'],
  ['ui.danger', 'ui.surface', 4.5, 'Erro / painel'],
  ['ui.focus', 'ui.surface', 3, 'Foco / painel'],
  ['ui.edge', 'ui.raised', 3, 'Borda de controle'],
  ['campo.draw', 'campo.pitch', 3, 'Seta / gramado'],
  ['marca.accent', 'marca.base', 3, 'Acento / placa do logo'],
];
const pick = (p, path) => path.split('.').reduce((o, k) => o[k], p);

function paletteCard(p) {
  const sw = SWATCHES.map(([path, label]) => {
    const hex = pick(p, path);
    return `<div class="pt-sw"><span class="pt-sw-c" style="background:${hex}"></span><span class="pt-sw-l">${label}</span><code>${hex}</code></div>`;
  }).join('');
  const rows = KEY_PAIRS.map(([fg, bg, min, label]) => {
    const [a, b] = [pick(p, fg), pick(p, bg)];
    const ratio = contrast(a, b);
    return `<tr><td><span class="pt-aa" style="color:${a};background:${b}">Aa</span>${label}</td><td>${ratio.toFixed(2)}</td><td>${min === 3 ? '3' : '4,5'}</td><td>${ratio >= min ? 'passa' : 'FALHA'}</td></tr>`;
  }).join('');
  return `<article class="pt-card" data-palette="${p.id}">
  <h3>${esc(p.nome)} <span class="pt-tag">${p.modo}</span></h3>
  <p class="pt-mu">${esc(p.resumo)}</p>
  ${mockup(p)}
  <div class="pt-sws">${sw}</div>
  <table class="pt-tab"><thead><tr><th>Par</th><th>Razão</th><th>Mín.</th><th></th></tr></thead><tbody>${rows}</tbody></table>
</article>`;
}

function logoCard(logo) {
  const p = FILE_PALETTE.id;
  const sizes = [48, 32, 24, 16]
    .map((s) => `<span class="pt-size">${inSymbol(logo, { icon: s <= 24, cls: `pt-s${s}` })}<small>${s}px</small></span>`)
    .join('');
  return `<article class="pt-card" data-logo="${logo.n}">
  <h3>Logo ${logo.n} · ${esc(logo.nome)}</h3>
  <p class="pt-mu">${esc(logo.conceito)}</p>
  <div class="pt-tiles">
    <div class="pt-tile ${p} pt-dark">${inLockup(logo)}</div>
    <div class="pt-tile ${p} pt-light">${inLockup(logo)}</div>
  </div>
  <div class="pt-tiles">
    <div class="pt-tile ${p} pt-dark pt-sizes">${sizes}</div>
    <div class="pt-tile pt-mono-l">${inLockup(logo, { mono: true })}</div>
    <div class="pt-tile pt-mono-d">${inLockup(logo, { mono: true })}</div>
  </div>
</article>`;
}

function matrix() {
  const head = paletas.map((p) => `<th>${esc(p.nome)}</th>`).join('');
  const rows = LOGOS.map((l) => {
    const cells = paletas
      .map((p) => `<td><div class="pt-x ${p.id} pt-dark">${inSymbol(l, { cls: 'pt-x-sym' })}${inSymbol(l, { icon: true, cls: 'pt-x-ico' })}</div><div class="pt-x ${p.id} pt-light">${inLockup(l, { cls: 'pt-x-lock' })}</div></td>`)
      .join('');
    return `<tr><th>${l.n}</th>${cells}</tr>`;
  }).join('');
  return `<table class="pt-mx"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

const radios = LOGOS.map(
  (l, i) => `<label><input type="radio" name="pt-mk" id="pt-mk-${l.n}"${i === 0 ? ' checked' : ''}> ${l.n} ${esc(l.nome)}</label>`,
).join('');
const showRules = LOGOS.slice(1)
  .map((l) => `.pt-gal:has(#pt-mk-${l.n}:checked) .pt-mk-logo[data-l="01"]{display:none}.pt-gal:has(#pt-mk-${l.n}:checked) .pt-mk-logo[data-l="${l.n}"]{display:inline-flex}`)
  .join('\n');

const CSS = `
.pt-gal{--pt-fg:var(--foreground,CanvasText);--pt-mu:var(--muted-foreground,color-mix(in srgb,var(--pt-fg) 72%,transparent));--pt-card:var(--card,transparent);--pt-bd:var(--border,color-mix(in srgb,var(--pt-fg) 20%,transparent));--pt-font:var(--font-sans,'Barlow',system-ui,sans-serif);width:100%;max-width:728px;color:var(--pt-fg);font-family:var(--pt-font);font-size:14px;line-height:1.45;display:flex;flex-direction:column;gap:24px}
.pt-gal *{box-sizing:border-box}
.pt-gal h2{font-size:18px;line-height:1.25;margin:0 0 4px;font-weight:650}
.pt-gal h3{font-size:15px;margin:0 0 4px;font-weight:650;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pt-gal p{margin:0}
.pt-gal code{font-family:ui-monospace,Consolas,monospace;font-size:11.5px}
.pt-mu{color:var(--pt-mu);max-width:68ch}
.pt-sec{display:flex;flex-direction:column;gap:12px}
.pt-card{background:var(--pt-card);border:1px solid var(--pt-bd);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;min-width:0}
.pt-tag{font-size:11px;font-weight:600;border:1px solid var(--pt-bd);border-radius:999px;padding:1px 8px;color:var(--pt-mu)}
.pt-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
.pt-tile{background:var(--lg-bg);border-radius:10px;padding:16px;display:flex;align-items:center;justify-content:center;min-height:84px}
.pt-mono-l{background:#ffffff;color:#141414;border:1px solid #e3e3e3}
.pt-mono-d{background:#141414;color:#ffffff}
.pt-lock{width:100%;max-width:260px;height:auto;display:block}
.pt-sizes{gap:14px;align-items:flex-end}
.pt-size{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--lg-w1)}
.pt-size small{font-size:10px;font-variant-numeric:tabular-nums}
.pt-s48{width:48px;height:48px}.pt-s32{width:32px;height:32px}.pt-s24{width:24px;height:24px}.pt-s16{width:16px;height:16px}
.pt-mx{width:100%;border-collapse:separate;border-spacing:6px;table-layout:fixed;margin:-6px}
.pt-mx th{font-size:12px;font-weight:600;color:var(--pt-mu);text-align:center}
.pt-mx tbody th{width:28px}
.pt-mx td{padding:0;vertical-align:top}
.pt-x{background:var(--lg-bg);display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 6px}
.pt-x.pt-dark{border-radius:8px 8px 0 0}.pt-x.pt-light{border-radius:0 0 8px 8px}
.pt-x-sym{width:40px;height:40px}.pt-x-ico{width:16px;height:16px}.pt-x-lock{width:100%;max-width:150px;height:auto}
.pt-pick{border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pt-pick legend{float:left;margin-right:4px;font-size:13px;color:var(--pt-mu)}
.pt-pick label{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--pt-bd);border-radius:999px;padding:4px 12px 4px 8px;cursor:pointer;font-size:13px}
.pt-pick label:has(input:checked){border-color:var(--pt-fg);font-weight:650}
.pt-pick input{margin:0;accent-color:currentColor}
.pt-pick input:focus-visible{outline:2px solid var(--pt-fg);outline-offset:2px}
.pt-mock{background:var(--m-ground);color:var(--m-ink);border:1px solid var(--m-line);border-radius:12px;padding:12px;font-size:12px;line-height:1.35}
.pt-mhead{display:flex;flex-wrap:wrap;align-items:center;gap:8px;background:var(--m-surface);border:1px solid var(--m-line);border-radius:8px;padding:8px 10px}
.pt-mk-logo{display:none;align-items:center}
.pt-mk-logo[data-l="01"]{display:inline-flex}
${showRules}
.pt-mk-lock{height:20px;width:auto;display:block}
.pt-sp{flex:1}
.pt-sel{display:inline-flex;align-items:center;gap:5px;background:var(--m-raised);border:1px solid var(--m-edge);border-radius:6px;padding:3px 6px 3px 8px;color:var(--m-ink);font-weight:600;font-variant-numeric:tabular-nums}
.pt-sel-k{color:var(--m-muted);font-weight:500}
.pt-ico{width:14px;height:14px;flex:none}
.pt-ghost{border:1px solid var(--m-edge);border-radius:6px;padding:3px 10px;color:var(--m-ink)}
.pt-mbody{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;align-items:flex-start}
.pt-pitch{flex:0 0 136px;width:136px;height:auto;display:block;border-radius:6px}
.pt-pitch text{font-family:var(--pt-font);font-size:3.3px;font-weight:700;text-anchor:middle}
.pt-side{flex:1 1 170px;min-width:0;background:var(--m-surface);border:1px solid var(--m-line);border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:8px}
.pt-side-t{font-weight:650;color:var(--m-inkSoft)}
.pt-bench{display:flex;align-items:center;gap:8px;padding-bottom:6px;border-bottom:1px solid var(--m-line)}
.pt-chip{background:var(--m-chip);color:var(--m-chipInk);font-weight:650;font-size:10.5px;border-radius:4px;padding:1px 0;width:34px;text-align:center}
.pt-n{margin-left:auto;color:var(--m-muted);font-variant-numeric:tabular-nums}
.pt-btn{background:var(--m-action);color:var(--m-onAction);border-radius:6px;padding:6px 10px;font-weight:650;text-align:center}
.pt-btn.is-hover{background:var(--m-actionHover)}
.pt-btn.is-focus{outline:2px solid var(--m-focus);outline-offset:2px}
.pt-states{display:flex;gap:8px}.pt-states .pt-btn{flex:1;padding:4px 6px;font-size:11px}
.pt-btn2{border:1px solid var(--m-edge);color:var(--m-ink);border-radius:6px;padding:5px 10px;text-align:center;font-weight:600}
.pt-msg{display:flex;gap:6px;align-items:center;font-weight:600}
.pt-ok{color:var(--m-success)}.pt-warn{color:var(--m-warning)}.pt-err{color:var(--m-danger)}
.pt-sws{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px}
.pt-sw{display:flex;flex-direction:column;gap:2px;font-size:12px;min-width:0}
.pt-sw-c{height:32px;border-radius:6px;border:1px solid color-mix(in srgb,var(--pt-fg) 22%,transparent)}
.pt-sw-l{font-weight:600}
.pt-sw code{color:var(--pt-mu)}
.pt-tab{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}
.pt-tab th{text-align:left;font-weight:600;color:var(--pt-mu);border-bottom:1px solid var(--pt-bd);padding:4px 6px}
.pt-tab td{border-bottom:1px solid var(--pt-bd);padding:4px 6px}
.pt-tab td:first-child{display:flex;align-items:center;gap:8px}
.pt-aa{display:inline-block;width:30px;text-align:center;border-radius:4px;font-weight:700;padding:1px 0}
.pt-rec{border-color:var(--pt-fg)}
${paletas.map(paletteCss).join('\n')}
`.trim();

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prancheta Tática — identidade visual</title></head><body>
<div class="pt-gal">
<style>
${CSS}
</style>
<section class="pt-sec" aria-labelledby="pt-h-logos">
  <h2 id="pt-h-logos">Três logos</h2>
  <p class="pt-mu">Mostrados na paleta Bordô &amp; Areia: fundo escuro, fundo claro, tamanhos pequenos (16 e 24 px usam o ícone simplificado) e versão em uma cor. O nome é desenhado em vetor, sem depender de fonte.</p>
  ${LOGOS.map(logoCard).join('\n')}
</section>
<section class="pt-sec" aria-labelledby="pt-h-mx">
  <h2 id="pt-h-mx">Cada logo em cada paleta</h2>
  <div class="pt-card">${matrix()}</div>
</section>
<section class="pt-sec" aria-labelledby="pt-h-pal">
  <h2 id="pt-h-pal">Três paletas</h2>
  <p class="pt-mu">O gramado continua verde nas três. Estados nunca dependem só da cor: mensagens têm ícone e texto, a seleção no campo é tracejada e o foco é um anel com folga.</p>
  <fieldset class="pt-pick"><legend>Logo nos mockups:</legend>${radios}</fieldset>
  ${paletas.map(paletteCard).join('\n')}
</section>
<div class="pt-card pt-rec"><p><strong>Recomendação:</strong> logo 01 (Jogada) com a paleta Bordô &amp; Areia. Detalhes e motivos no README.</p></div>
</div>
</body></html>
`;
writeFileSync(join(here, 'galeria.html'), html, 'utf8');
console.log(`Gerados ${LOGOS.length * 5} SVGs em logos/ e galeria.html (${(html.length / 1024).toFixed(1)} KB).`);
