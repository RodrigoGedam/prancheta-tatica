import Papa from 'papaparse'
import { isPosition, type Position } from '@/lib/positions'

export interface SquadPlayer { name: string; number: number | null; position: Position }
export interface ParsedSquad { players: SquadPlayer[]; sourceDate: string | null; issues: string[] }

export function mapWikipediaPosition(code: string): Position | null {
  const value = code.trim()
  const aliases: Record<string, Position> = { G: 'GOL', Z: 'ZAG', V: 'VOL', M: 'MC', A: 'ATA' }
  return isPosition(value) ? value : Object.hasOwn(aliases, value) ? aliases[value]! : null
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—' }
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity: string, code: string) => {
    if (!code.startsWith('#')) return named[code] ?? entity
    const point = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1))
    return point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '\uFFFD'
  })
}

function cleanText(html: string): string {
  return decodeEntities(html.replace(/<(sup|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function sourceDate(html: string): string | null {
  const match = cleanText(html).match(/Última atualização:\s*(\d{1,2}) de ([\p{L}]+) de (\d{4})/iu)
  if (!match) return null
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  const day = Number(match[1])
  const month = months.indexOf(match[2]!.toLowerCase()) + 1
  const year = Number(match[3])
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month === 0 || day < 1 || day > days[month - 1]!) return null
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseWikipediaSquad(html: string, options?: { sectionId?: string }): ParsedSquad {
  const players: SquadPlayer[] = []
  const issues: string[] = []
  let source = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
  if (options?.sectionId !== undefined) {
    const element = [...source.matchAll(/<[a-z][\w:-]*\b[^>]*>/gi)].find(tag => {
      const id = tag[0].match(/\sid\s*=\s*(["'])(.*?)\1/i)
      return id && decodeEntities(id[2]!) === options.sectionId
    })
    if (!element) return { players, sourceDate: null, issues: [`Seção "${options.sectionId}" não encontrada`, 'Nenhum jogador encontrado'] }
    source = source.slice(element.index! + element[0].length)
    const nextHeading = source.search(/<h[234]\b/i)
    if (nextHeading >= 0) source = source.slice(0, nextHeading)
  }
  const numbers = new Set<number>()
  for (const row of source.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)) {
    const cells = [...row[1]!.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/gi)].map(cell => cleanText(cell[1]!))
    if (cells.length % 3 !== 0) continue
    for (let i = 0; i < cells.length; i += 3) {
      const numberText = cells[i]!
      const code = cells[i + 1]!
      const name = cells[i + 2]!
      if (!/^\d{0,2}$/.test(numberText) || !/^[A-Z]{1,3}$/.test(code) || !name) continue
      const position = mapWikipediaPosition(code)
      if (!position) { issues.push(`Posição desconhecida para ${name}: ${code}`); continue }
      if (name.length > 80) { issues.push(`Nome com mais de 80 caracteres: ${name}`); continue }
      const number = numberText === '' ? null : Number(numberText)
      if (number !== null) {
        if (numbers.has(number)) issues.push(`Número ${number} repetido: ${name}`)
        numbers.add(number)
      }
      players.push({ name, number, position })
    }
  }
  players.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity))
  if (!players.length) issues.push('Nenhum jogador encontrado')
  return { players, sourceDate: sourceDate(source), issues }
}

export function pickStarters<P extends { number: number | null; position: Position }>(players: readonly P[]): (P & { isStarter: boolean })[] {
  const slots: Position[] = ['GOL', 'LD', 'LE', 'ZAG', 'ZAG', 'VOL', 'MC', 'MC', 'ATA', 'ATA', 'ATA']
  const alternatives: Partial<Record<Position, Position[]>> = {
    LD: ['ZAG', 'LE', 'VOL'], LE: ['ZAG', 'LD', 'VOL'], ZAG: ['LD', 'LE', 'VOL'],
    VOL: ['MC', 'ZAG'], MC: ['VOL', 'ATA'], ATA: ['MC', 'VOL'],
  }
  const ranked = players.map((player, index) => ({ player, index })).sort((a, b) => (a.player.number ?? Infinity) - (b.player.number ?? Infinity))
  const selected = new Set<number>()
  const filled = new Set<number>()
  const fill = (slot: number, positions: readonly Position[]) => {
    for (const position of positions) {
      const candidate = ranked.find(p => !selected.has(p.index) && p.player.position === position)
      if (candidate) { selected.add(candidate.index); filled.add(slot); return }
    }
  }
  slots.forEach((position, i) => fill(i, [position]))
  slots.forEach((position, i) => { if (!filled.has(i)) fill(i, alternatives[position] ?? []) })
  slots.forEach((position, i) => {
    if (filled.has(i) || position === 'GOL') return
    const candidate = ranked.find(p => !selected.has(p.index) && p.player.position !== 'GOL')
    if (candidate) selected.add(candidate.index)
  })
  return players.map((player, i) => ({ ...player, isStarter: selected.has(i) }))
}

export function toPlayersCsv(players: readonly { name: string; number: number | null; position: Position; isStarter: boolean }[]): string {
  return Papa.unparse({ fields: ['nome', 'numero', 'posicao', 'apelido', 'titular'], data: players.map(p => [p.name, p.number ?? '', p.position, '', p.isStarter ? 'S' : 'N']) }, { delimiter: ';', newline: '\n' })
}