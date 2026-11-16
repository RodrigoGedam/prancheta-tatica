import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parsePlayersCsv } from '@/lib/csv'
import { POSITIONS, type Position } from '@/lib/positions'
import { mapWikipediaPosition, parseWikipediaSquad, pickStarters, toPlayersCsv } from './index'
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), 'utf8')
const row = (n: string, p: string, name: string) => `<tr><td>${n}</td><td>${p}</td><td>${name}</td></tr>`
const flamengo = () => parseWikipediaSquad(fixture('flamengo-secao'), { sectionId: 'Elenco_atual' })
it('mapeia posições', () => {
  for (const [code, position] of Object.entries({ G: 'GOL', Z: 'ZAG', V: 'VOL', M: 'MC', A: 'ATA' })) expect(mapWikipediaPosition(` ${code} `)).toBe(position)
  for (const p of POSITIONS) expect(mapWikipediaPosition(p)).toBe(p)
  expect(mapWikipediaPosition('XX')).toBeNull()
})
it('lê Flamengo', () => {
  const r = flamengo()
  expect(r.players).toHaveLength(27)
  expect(r.sourceDate).toBe('2026-09-20')
  expect(r.issues).toEqual([])
  expect(r.players[0]).toEqual({ name: 'Rossi', number: 1, position: 'GOL' })
  for (const p of [{ name: 'Varela', number: 2, position: 'LD' }, { name: 'De Arrascaeta', number: 10, position: 'MC' }, { name: 'Pedro', number: 9, position: 'ATA' }, { name: 'João Victor', number: 61, position: 'ZAG' }]) expect(r.players).toContainEqual(p)
})
it('lê Grêmio', () => {
  const r = parseWikipediaSquad(fixture('gremio-secao'), { sectionId: 'Elenco_atual' })
  expect(r.players).toHaveLength(34)
  expect(r.sourceDate).toBe('2026-09-13')
  expect(r.players[0]).toEqual({ name: 'Weverton', number: 1, position: 'GOL' })
  expect(r.players).toContainEqual({ name: 'Balbuena', number: 2, position: 'ZAG' })
  expect(r.players).toContainEqual({ name: 'Marcos Rocha', number: 14, position: 'LD' })
  expect(r.issues).toEqual([])
})
it('lê Athletico e ignora navbox Mirassol', () => {
  const r = parseWikipediaSquad(fixture('athletico-predefinicao'))
  expect(r.players).toHaveLength(30)
  expect(r.sourceDate).toBe('2025-09-19')
  expect(r.issues).toEqual([])
  expect(parseWikipediaSquad(fixture('mirassol-navbox'))).toMatchObject({ players: [], issues: ['Nenhum jogador encontrado'] })
})
it('isola seção com id exato', () => {
  const html = `<h2 id="Elenco_atual_2">Outro</h2>${row('2', 'A', 'Outro')}<h2><span id="Elenco_atual">Elenco</span></h2>${row('1', 'G', 'Certo')}<h3 id="Elenco_feminino_atual">Outro</h3>${row('3', 'M', 'Outra')}`
  expect(parseWikipediaSquad(html, { sectionId: 'Elenco_atual' }).players.map(p => p.name)).toEqual(['Certo'])
  const missing = parseWikipediaSquad(html, { sectionId: 'Ausente' })
  expect(missing.players).toEqual([])
  expect(missing.issues.join()).toContain('Ausente')
  expect(parseWikipediaSquad('<h2 id="Elenco_atual_2">Outro</h2>', { sectionId: 'Elenco_atual' }).issues.join()).toContain('Elenco_atual')
})
it('usa a primeira seção correspondente e decodifica entidades no id', () => {
  const html = `<h2 id='Elenco&#95;atual'>Elenco</h2>${row('1', 'G', 'Primeiro')}<h2 id="Elenco_atual">Duplicado</h2>${row('2', 'A', 'Segundo')}`
  expect(parseWikipediaSquad(html, { sectionId: 'Elenco_atual' }).players).toEqual([
    { name: 'Primeiro', number: 1, position: 'GOL' },
  ])
})
it('valida trincas, ordena e limpa nomes', () => {
  const r = parseWikipediaSquad(row('', 'A', 'Sem número') + row('2', 'XX', 'Desconhecido') + row('2', 'M', 'João&nbsp;&amp; &#x27;José&#39;&#160;&#8211;<sup>[1]</sup><style>lixo</style> Silva') + row('2', 'Z', 'Repetido') + row('3', 'A', 'x'.repeat(81)) + row('', '', '') + row('N.º', 'Pos.', 'Nome') + row('', 'Técnico', 'Treinador') + row('100', 'A', 'Inválido') + '<tr><td>1</td><td>G</td></tr>')
  expect(r.players.map(p => p.name)).toEqual(["João & 'José' – Silva", 'Repetido', 'Sem número'])
  expect(r.players.at(-1)?.number).toBeNull()
  expect(r.issues).toHaveLength(3)
  expect(r.issues.join()).toMatch(/Desconhecido.*XX/)
  expect(r.issues.join()).toContain('repetido')
  expect(r.issues.join()).toContain('80')
})
it.each([['14 de Setembro de 2026', '2026-09-14'], ['01 de setembro de 2026', '2026-09-01'], ['31 de setembro de 2026', null], ['29 de fevereiro de 2025', null], ['29 de fevereiro de 2024', '2024-02-29'], ['00 de setembro de 2026', null], ['14 de inexistente de 2026', null]])('valida data %s', (date, expected) => {
  expect(parseWikipediaSquad(`Última atualização: ${date}${row('1', 'G', 'Goleiro')}`).sourceDate).toBe(expected)
})
const player = (number: number | null, position: Position) => ({ number, position })
it('escala Flamengo preservando entrada', () => {
  const players = flamengo().players
  const r = pickStarters(players)
  expect(r.filter(p => p.isStarter)).toHaveLength(11)
  expect(r.filter(p => p.isStarter && p.position === 'GOL').map(p => p.name)).toEqual(['Rossi'])
  expect(r.map(p => ({ name: p.name, number: p.number, position: p.position }))).toEqual(players)
  expect(players[0]).not.toHaveProperty('isStarter')
})
it('prioriza exatas e alternativas em ordem quando não há LE', () => {
  const r = pickStarters([player(1, 'GOL'), player(2, 'LD'), player(3, 'ZAG'), player(4, 'ZAG'), player(90, 'ZAG'), player(1, 'VOL'), player(5, 'MC'), player(6, 'MC'), player(7, 'ATA'), player(8, 'ATA'), player(9, 'ATA'), player(10, 'VOL')])
  expect(r[4]?.isStarter).toBe(true)
  expect(r[11]?.isStarter).toBe(false)
})
it('limita goleiros e não promove jogador de linha para o gol', () => {
  expect(pickStarters([player(3, 'GOL'), player(1, 'GOL'), player(2, 'GOL'), player(4, 'ATA')]).map(p => p.isStarter)).toEqual([false, true, false, true])
  const r = pickStarters(Array.from({ length: 12 }, (_, i) => player(i + 1, 'PE')))
  expect(r.filter(p => p.isStarter)).toHaveLength(10)
  expect(r.filter(p => p.isStarter && p.position === 'GOL')).toHaveLength(0)
})
it('trata elencos pequenos, empate e número ausente', () => {
  expect(pickStarters([player(null, 'PE'), player(2, 'MC')]).every(p => p.isStarter)).toBe(true)
  expect(pickStarters([player(null, 'GOL'), player(2, 'GOL'), player(2, 'GOL')]).map(p => p.isStarter)).toEqual([false, true, false])
  expect(pickStarters([])).toEqual([])
})
it('exporta CSV compatível com aspas e ponto e vírgula', () => {
  const players = [{ name: 'João; "Teste"', number: 1, position: 'GOL' as const, isStarter: true }, { name: 'José', number: null, position: 'ATA' as const, isStarter: false }]
  const csv = toPlayersCsv(players)
  expect(csv.split('\n')[0]).toBe('nome;numero;posicao;apelido;titular')
  expect(csv).not.toContain('\r')
  const r = parsePlayersCsv(csv)
  expect(r.fileIssues).toEqual([])
  expect(r.rows.flatMap(r => r.issues)).toEqual([])
  expect(r.rows.map(r => r.player)).toEqual(players.map(p => ({ ...p, nickname: null })))
})
