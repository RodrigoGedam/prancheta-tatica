// Confere a identidade visual: contraste WCAG das paletas, estrutura dos SVGs e regras da galeria.
// Uso: node docs/design/identidade-2026-11/verificar.mjs   (sem dependências; sai com código 1 se algo falhar)
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast } from './contraste.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { paletas } = JSON.parse(readFileSync(join(here, 'paletas.json'), 'utf8'));
const failures = [];
const fail = (msg) => failures.push(msg);

// ---------- contraste (WCAG 2.x) ----------
// [frente, fundo, mínimo, uso]. Caminhos no formato "grupo.token".
export const TEXT = 4.5;
export const UI = 3;
export const PAIRS = [
  ['ui.ink', 'ui.ground', TEXT, 'texto principal no fundo'],
  ['ui.ink', 'ui.surface', TEXT, 'texto principal no painel'],
  ['ui.ink', 'ui.raised', TEXT, 'texto principal no cartão'],
  ['ui.inkSoft', 'ui.surface', TEXT, 'texto secundário no painel'],
  ['ui.inkSoft', 'ui.raised', TEXT, 'texto secundário no cartão'],
  ['ui.muted', 'ui.ground', TEXT, 'legenda no fundo'],
  ['ui.muted', 'ui.surface', TEXT, 'legenda no painel'],
  ['ui.muted', 'ui.raised', TEXT, 'legenda no cartão'],
  ['ui.highlight', 'ui.surface', TEXT, 'texto de destaque no painel'],
  ['ui.highlight', 'ui.raised', TEXT, 'texto de destaque no cartão'],
  ['ui.chipInk', 'ui.chip', TEXT, 'texto do chip de posição'],
  ['ui.onAction', 'ui.action', TEXT, 'rótulo do botão principal'],
  ['ui.onAction', 'ui.actionHover', TEXT, 'rótulo do botão principal (hover)'],
  ['ui.success', 'ui.surface', TEXT, 'mensagem de sucesso'],
  ['ui.warning', 'ui.surface', TEXT, 'mensagem de aviso'],
  ['ui.danger', 'ui.surface', TEXT, 'mensagem de erro'],
  ['ui.danger', 'ui.raised', TEXT, 'mensagem de erro no cartão'],
  ['ui.focus', 'ui.ground', UI, 'anel de foco no fundo'],
  ['ui.focus', 'ui.surface', UI, 'anel de foco no painel'],
  ['ui.focus', 'ui.raised', UI, 'anel de foco no cartão'],
  ['ui.edge', 'ui.surface', UI, 'borda de controle no painel'],
  ['ui.edge', 'ui.raised', UI, 'borda de controle no cartão'],
  ['marca.mark', 'marca.base', UI, 'desenho do símbolo sobre a placa'],
  ['marca.accent', 'marca.base', UI, 'acento do símbolo sobre a placa'],
  ['marca.wordDark', 'marca.night', TEXT, 'nome no fundo escuro'],
  ['marca.word2Dark', 'marca.night', TEXT, 'segunda palavra no fundo escuro'],
  ['marca.wordLight', 'marca.paper', TEXT, 'nome no fundo claro'],
  ['marca.word2Light', 'marca.paper', TEXT, 'segunda palavra no fundo claro'],
  ['marca.base', 'marca.paper', UI, 'placa do símbolo no fundo claro'],
  ['campo.line', 'campo.pitch', UI, 'linhas do campo'],
  ['campo.line', 'campo.stripe', UI, 'linhas do campo (faixa)'],
  ['campo.draw', 'campo.pitch', UI, 'desenho/seta sobre o gramado'],
  ['campo.draw', 'campo.stripe', UI, 'desenho/seta sobre a faixa'],
  ['campo.tokenEdge', 'campo.pitch', UI, 'contorno do jogador sobre o gramado'],
  ['ui.onAction', 'ui.action', TEXT, 'número do mandante (token)'],
  ['campo.awayInk', 'campo.away', TEXT, 'número do visitante (token)'],
  ['campo.awayInk', 'marca.accent', TEXT, 'número do goleiro mandante (token)'],
];

const pick = (pal, path) => path.split('.').reduce((o, k) => o?.[k], pal);
export const contrastRows = [];
for (const pal of paletas) {
  for (const [fg, bg, min, use] of PAIRS) {
    const a = pick(pal, fg);
    const b = pick(pal, bg);
    if (!a || !b) {
      fail(`${pal.id}: token ausente ${!a ? fg : bg}`);
      continue;
    }
    const ratio = contrast(a, b);
    contrastRows.push({ id: pal.id, fg, bg, a, b, ratio, min, use });
    if (ratio < min) fail(`${pal.id}: ${use} ${fg} ${a} / ${bg} ${b} = ${ratio.toFixed(2)} < ${min}`);
  }
}

// ---------- SVGs ----------
function checkXml(name, src) {
  if (src.charCodeAt(0) === 0xfeff) fail(`${name}: tem BOM`);
  if (!/^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(src)) fail(`${name}: não começa com <svg xmlns>`);
  if (!/viewBox="[-\d. ]+"/.test(src)) fail(`${name}: sem viewBox`);
  if (!/<title>[^<]+<\/title>/.test(src)) fail(`${name}: sem <title>`);
  if (/<image\b|href="(?!#)|url\((?!#)|@import|<script\b|<foreignObject\b/i.test(src))
    fail(`${name}: referência externa, raster ou script`);
  // Balanço das tags: cada <x> aberta precisa fechar na ordem certa.
  const stack = [];
  const tag = /<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g;
  for (const [, close, tagName, self] of src.replace(/<!--[\s\S]*?-->/g, '').matchAll(tag)) {
    if (self) continue;
    if (!close) stack.push(tagName);
    else if (stack.pop() !== tagName) {
      fail(`${name}: tag </${tagName}> fora de ordem`);
      return;
    }
  }
  if (stack.length) fail(`${name}: tags sem fechar: ${stack.join(', ')}`);
  const ids = [...src.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) fail(`${name}: id repetido`);
  for (const [, ref] of src.matchAll(/url\(#([^)]+)\)/g)) if (!ids.includes(ref)) fail(`${name}: url(#${ref}) sem alvo`);
}

const logoDir = join(here, 'logos');
const svgs = readdirSync(logoDir).filter((f) => f.endsWith('.svg'));
const EXPECTED = ['simbolo', 'icone', 'horizontal-fundo-escuro', 'horizontal-fundo-claro', 'mono'];
for (const n of ['01', '02', '03'])
  for (const kind of EXPECTED)
    if (!svgs.includes(`logo-${n}-${kind}.svg`)) fail(`falta logos/logo-${n}-${kind}.svg`);
for (const f of svgs) {
  const src = readFileSync(join(logoDir, f), 'utf8');
  checkXml(f, src);
  if (f.includes('horizontal') && !/aria-label="Prancheta Tática"|<title>Prancheta Tática/.test(src))
    fail(`${f}: o nome Prancheta Tática não aparece no título`);
}

// ---------- galeria ----------
const html = readFileSync(join(here, 'galeria.html'), 'utf8');
if (html.charCodeAt(0) === 0xfeff) fail('galeria.html: tem BOM');
if (/https?:\/\/(?!www\.w3\.org\/)/.test(html)) fail('galeria.html: URL externa');
if (/<script\b[^>]*\bsrc=|<link\b|@import|@font-face|<img\b/i.test(html)) fail('galeria.html: recurso externo');
if (/\d+(\.\d+)?d?vh\b|height:\s*100%/.test(html)) fail('galeria.html: usa vh ou height:100%');
if (/(^|[\s}])(html|body)\s*[,{]/.test(html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '')) fail('galeria.html: estiliza html/body');
for (const pal of paletas)
  for (const hex of [pal.ui.action, pal.ui.focus, pal.ui.ground, pal.marca.base])
    if (!html.toUpperCase().includes(hex.toUpperCase())) fail(`galeria.html: falta ${hex} da ${pal.id}`);
for (const n of ['01', '02', '03']) if (!html.includes(`data-logo="${n}"`)) fail(`galeria.html: falta o logo ${n}`);
const htmlSvgCount = (html.match(/<svg\b/g) ?? []).length;
{
  // Balanço das tags da galeria (ignora o CSS e os elementos vazios do HTML).
  const body = html.replace(/<style>[\s\S]*?<\/style>/, '');
  const stack = [];
  for (const [, close, tagName, self] of body.matchAll(/<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g)) {
    if (self || ['input', 'br', 'img', 'meta'].includes(tagName)) continue;
    if (!close) stack.push(tagName);
    else if (stack.pop() !== tagName) {
      fail(`galeria.html: </${tagName}> fora de ordem`);
      break;
    }
  }
  if (stack.length) fail(`galeria.html: tags sem fechar: ${stack.join(', ')}`);
  const ids = [...body.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) fail('galeria.html: id repetido');
}

// ---------- relatório ----------
const fmt = (r) => r.ratio.toFixed(2).padStart(6);
for (const pal of paletas) {
  const rows = contrastRows.filter((r) => r.id === pal.id);
  const worstText = rows.filter((r) => r.min === TEXT).sort((a, b) => a.ratio - b.ratio)[0];
  const worstUi = rows.filter((r) => r.min === UI).sort((a, b) => a.ratio - b.ratio)[0];
  console.log(`${pal.id} ${pal.nome}: ${rows.length} pares; pior texto ${fmt(worstText)} (${worstText.use}); pior UI ${fmt(worstUi)} (${worstUi.use})`);
}
if (process.argv.includes('--tabela'))
  for (const r of contrastRows) console.log(`${r.id}\t${r.use}\t${r.a} / ${r.b}\t${r.ratio.toFixed(2)}\t>= ${r.min}`);
console.log(`${svgs.length} SVGs conferidos; galeria com ${htmlSvgCount} SVGs embutidos.`);
if (failures.length) {
  console.error(`\n${failures.length} falha(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Tudo certo.');
