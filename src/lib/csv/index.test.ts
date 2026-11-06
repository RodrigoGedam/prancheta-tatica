import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { decodeCsvBytes, parsePlayersCsv } from './index'

it('decodifica UTF-8 com/sem BOM, Windows-1252 binário e vazio', () => {
  const text = 'nome;numero;posicao\nJosé Gonçalves;10;MEI\n'
  for (const input of [text, `\uFEFF${text}`]) {
    expect(decodeCsvBytes(new TextEncoder().encode(input))).toEqual({ text, encoding: 'utf-8' })
  }
  expect(decodeCsvBytes(readFileSync(new URL('./fixtures/players-windows-1252.csv', import.meta.url))))
    .toEqual({ text, encoding: 'windows-1252' })
  expect(decodeCsvBytes(new Uint8Array())).toEqual({ text: '', encoding: 'utf-8' })
})

it('importa campos completos com trim e titular S/N', () => {
  const result = parsePlayersCsv('nome;numero;posicao;apelido;titular\n José ; 10 ;mei; Zé ;S\nAna;0;GOL;;N')
  expect(result.fileIssues).toEqual([])
  expect(result.rows.map(row => row.player)).toEqual([
    { name: 'José', number: 10, position: 'MEI', nickname: 'Zé', isStarter: true },
    { name: 'Ana', number: 0, position: 'GOL', nickname: null, isStarter: false },
  ])
  expect(result.rows[0]?.raw).toEqual({ nome: 'José', numero: '10', posicao: 'mei', apelido: 'Zé', titular: 'S' })
  expect(result.rows.every(row => row.issues.length === 0)).toBe(true)
})

it('normaliza cabeçalho com BOM, caixa, acentos, espaços, ordem e extras', () => {
  const { rows } = parsePlayersCsv('\uFEFF POSIÇÃO ;extra;Número;Nome\nátá;ignorado;99;Bia')
  expect(rows[0]?.player).toEqual({ name: 'Bia', number: 99, position: 'ATA', nickname: null, isStarter: true })
  expect(rows[0]?.issues).toEqual([])
})

it('sem coluna titular, só o primeiro goleiro entra e o próximo de linha ocupa a vaga', () => {
  const lines = ['G1;GOL', 'G2;GOL', ...Array.from({ length: 11 }, (_, i) => `L${i};MC`)]
  const players = parsePlayersCsv(`nome;posicao\n${lines.join('\n')}`).rows.flatMap(row => row.player ? [row.player] : [])
  expect(players.filter(p => p.isStarter).map(p => p.name)).toEqual(['G1', ...Array.from({ length: 10 }, (_, i) => `L${i}`)])
})

it('com coluna titular, avisa e deixa como reserva o segundo goleiro e o 12º titular', () => {
  const lines = ['G1;GOL;S', 'G2;GOL;S', ...Array.from({ length: 11 }, (_, i) => `L${i};MC;S`)]
  const { rows } = parsePlayersCsv(`nome;posicao;titular\n${lines.join('\n')}`)
  expect(rows.filter(row => row.player?.isStarter)).toHaveLength(11)
  expect(rows[1]?.player?.isStarter).toBe(false)
  expect(rows[1]?.issues.map(i => i.message)).toEqual(['Já há um goleiro titular; considerado reserva'])
  expect(rows[12]?.player?.isStarter).toBe(false)
  expect(rows[12]?.issues.map(i => i.message)).toEqual(['Já há 11 titulares; considerado reserva'])
})

it('escala somente os primeiros 11 válidos sem coluna titular', () => {
  const records = Array.from({ length: 14 }, (_, i) => `Jogador ${i};MC`)
  records.splice(4, 0, ';MC')
  const { rows } = parsePlayersCsv(`nome;posicao\n${records.join('\n')}`)
  expect(rows[4]?.player).toBeNull()
  expect(rows.flatMap(row => row.player ? [row.player.isStarter] : [])).toEqual([
    ...Array<boolean>(11).fill(true), ...Array<boolean>(3).fill(false),
  ])
})

it('reporta campos obrigatórios e posições desconhecidas', () => {
  const { rows } = parsePlayersCsv('nome;posicao;numero\n;;10\nA;\n;MC\nB;lat\nC;Lateral')
  expect(rows.slice(0, 3).map(row => row.player)).toEqual([null, null, null])
  expect(rows[0]?.issues).toEqual([
    { line: 2, severity: 'error', message: 'Nome obrigatório' },
    { line: 2, severity: 'error', message: 'Posição obrigatória' },
  ])
  expect(rows[1]?.issues[0]?.message).toBe('Posição obrigatória')
  expect(rows[2]?.issues[0]?.message).toBe('Nome obrigatório')
  expect(rows.slice(3).map(row => row.issues[0]?.message)).toEqual(['Posição "LAT" desconhecida', 'Posição "LATERAL" desconhecida'])
  expect(rows.slice(3).every(row => row.player !== null)).toBe(true)
})

it.each(['10a', '7.5', '-1', '100', '1e1', '+7'])('ignora número inválido %s', value => {
  const row = parsePlayersCsv(`nome;posicao;numero\nA;MC;${value}`).rows[0]
  expect(row?.player?.number).toBeNull()
  expect(row?.issues).toEqual([{ line: 2, severity: 'warning', message: `Número "${value}" inválido, ignorado` }])
})

it('detecta repetições só entre válidos citando a primeira linha', () => {
  const { rows } = parsePlayersCsv('nome;posicao;numero\n;MC;10\nA;MC;10\nB;MC;10\nC;MC;10')
  expect(rows[1]?.issues).toEqual([])
  expect(rows[2]?.issues).toEqual([{ line: 4, severity: 'warning', message: 'Número 10 repetido (linha 3)' }])
  expect(rows[3]?.issues[0]?.message).toBe('Número 10 repetido (linha 3)')
})

it('conta linhas físicas CRLF ignorando linhas vazias', () => {
  const { rows } = parsePlayersCsv('\r\n  \r\nnome;posicao\r\nA;MC\r\n ; ; \r\n\r\nB;ATA\r\n\r\n')
  expect(rows.map(row => row.line)).toEqual([4, 7])
  expect(rows[0]?.raw.numero).toBe('')
})

it('aceita delimitador, aspas escapadas e quebras de linha entre aspas', () => {
  const { rows } = parsePlayersCsv('nome;numero;posicao\n"Silva; Jr.";10;ATA\n"José\n""Zé""";7;MC\nAna;;GOL')
  expect(rows.map(row => row.line)).toEqual([2, 3, 5])
  expect(rows.map(row => row.player?.name)).toEqual(['Silva; Jr.', 'José\n"Zé"', 'Ana'])
})

it.each(['S', 'sim', ' n ', 'NAO', 'não', '', 'X'])('normaliza titular %s', value => {
  const row = parsePlayersCsv(`nome;posicao;titular\nA;MC;${value}`).rows[0]
  expect(row?.player?.isStarter).toBe(['S', 'sim'].includes(value))
  expect(row?.issues).toEqual(value === 'X' ? [{ line: 2, severity: 'warning', message: 'Titular "X" inválido; considerado reserva' }] : [])
})

it.each([
  ['', ['Arquivo vazio.']],
  [' \n\r\n', ['Arquivo vazio.']],
  ['nome,numero,posicao\nA,10,MC', ['Use ponto e vírgula (;) como separador.']],
  ['numero\n10', ['Coluna obrigatória ausente: nome', 'Coluna obrigatória ausente: posicao']],
  ['nome\nA', ['Coluna obrigatória ausente: posicao']],
])('reporta erros de arquivo: %j', (text, messages) => {
  const result = parsePlayersCsv(text)
  expect(result.rows).toEqual([])
  expect(result.fileIssues).toEqual(messages.map(message => ({ line: null, severity: 'error', message })))
})
it('rejeita o arquivo com aspas sem fechamento', () => {
  const result = parsePlayersCsv('nome;posicao;apelido\nAna;MC;"A\nBia;GOL;B')
  expect(result.rows).toEqual([])
  expect(result.fileIssues).toEqual([{ line: null, severity: 'error', message: 'Aspas sem fechamento na linha 2.' }])
})
it('aplica os limites de tamanho do banco como erro de linha', () => {
  const { rows } = parsePlayersCsv(`nome;posicao;apelido\n${'N'.repeat(81)};MC;\nA;MC;${'x'.repeat(41)}\nB;${'P'.repeat(11)};\n${'N'.repeat(80)};MC;${'x'.repeat(40)}`)
  expect(rows.map(row => row.issues.map(i => i.message))).toEqual([
    ['Nome com mais de 80 caracteres'],
    ['Apelido com mais de 40 caracteres'],
    ['Posição com mais de 10 caracteres'],
    [],
  ])
  expect(rows.map(row => row.player !== null)).toEqual([false, false, false, true])
})
