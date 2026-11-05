import Papa from 'papaparse'
import { z } from 'zod'
import { isPosition } from '@/lib/positions'

export type CsvEncoding = 'utf-8' | 'windows-1252'

export interface DecodedCsv {
  text: string
  encoding: CsvEncoding
}

/** Detecta UTF-8 (com ou sem BOM) ou Windows-1252 e devolve o texto sem BOM. */
export function decodeCsvBytes(bytes: Uint8Array): DecodedCsv {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8' }
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'utf-8' }
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'windows-1252' }
  }
}

export type CsvIssueSeverity = 'error' | 'warning'

export interface CsvIssue {
  /** Linha física no arquivo (cabeçalho = 1); null para problemas do arquivo inteiro. */
  line: number | null
  severity: CsvIssueSeverity
  /** Mensagem em pt-BR, pronta para a interface. */
  message: string
}

/** Valores brutos da linha, já sem espaços nas pontas ('' quando ausentes). */
export interface CsvRawRow {
  nome: string
  numero: string
  posicao: string
  apelido: string
  titular: string
}

export interface CsvPlayer {
  name: string
  number: number | null
  /** Em maiúsculas e sem acentos; pode não estar em POSITIONS (gera aviso). */
  position: string
  nickname: string | null
  isStarter: boolean
}

export interface CsvRow {
  line: number
  raw: CsvRawRow
  /** null quando a linha tem algum erro (será ignorada na importação). */
  player: CsvPlayer | null
  issues: CsvIssue[]
}

export interface ParsedPlayersCsv {
  rows: CsvRow[]
  /** Problemas do arquivo inteiro (ex.: coluna obrigatória ausente). */
  fileIssues: CsvIssue[]
}

// Mesmos limites das colunas em supabase/migrations/0001_init.sql.
const MAX_NAME = 80
const MAX_NICKNAME = 40
const MAX_POSITION = 10

export function parsePlayersCsv(text: string): ParsedPlayersCsv {
  const source = text.replace(/^\uFEFF/, '')
  const rows: CsvRow[] = []
  const fileIssues: CsvIssue[] = []
  let headers: string[] | undefined
  let cursor = 0
  let line = 1
  let validCount = 0
  const firstNumberLines = new Map<number, number>()
  const fileError = (message: string) => fileIssues.push({ line: null, severity: 'error', message })

  Papa.parse<string[]>(source, {
    delimiter: ';',
    skipEmptyLines: false,
    step(result, parser) {
      const startLine = line
      // O cursor inclui quebras dentro de aspas e o terminador do registro.
      const consumed = source.slice(cursor, result.meta.cursor)
      line += (consumed.match(/\r\n|\n|\r/g) ?? []).length
      cursor = result.meta.cursor
      if (result.errors.some(error => error.type === 'Quotes')) {
        // O resto do arquivo foi engolido pelo campo aberto: importar seria truncar o elenco.
        fileError(`Aspas sem fechamento na linha ${startLine}.`)
        parser.abort()
        return
      }
      const fields = z.array(z.string().trim()).parse(result.data)
      if (fields.every(field => field === '')) return
      if (!headers) {
        headers = fields.map(field => normalize(field).toLowerCase())
        if (headers.length === 1 && fields[0]?.includes(',')) {
          fileError('Use ponto e vírgula (;) como separador.')
        } else {
          for (const required of ['nome', 'posicao']) {
            if (!headers.includes(required)) fileError(`Coluna obrigatória ausente: ${required}`)
          }
        }
        if (fileIssues.length) parser.abort()
        return
      }
      const columns = headers
      const value = (key: string) => fields[columns.indexOf(key)] ?? ''
      const raw: CsvRawRow = {
        nome: value('nome'), numero: value('numero'), posicao: value('posicao'),
        apelido: value('apelido'), titular: value('titular'),
      }
      const issues: CsvIssue[] = []
      const issue = (severity: CsvIssueSeverity, message: string) => issues.push({ line: startLine, severity, message })
      if (!raw.nome) issue('error', 'Nome obrigatório')
      else if (raw.nome.length > MAX_NAME) issue('error', `Nome com mais de ${MAX_NAME} caracteres`)
      const position = normalize(raw.posicao)
      if (!position) issue('error', 'Posição obrigatória')
      else if (position.length > MAX_POSITION) issue('error', `Posição com mais de ${MAX_POSITION} caracteres`)
      else if (!isPosition(position)) issue('warning', `Posição "${position}" desconhecida`)
      if (raw.apelido.length > MAX_NICKNAME) issue('error', `Apelido com mais de ${MAX_NICKNAME} caracteres`)
      let number: number | null = null
      if (raw.numero) {
        const parsed = /^\d+$/.test(raw.numero)
          ? z.number().int().min(0).max(99).safeParse(Number(raw.numero))
          : null
        if (parsed?.success) number = parsed.data
        else issue('warning', `Número "${raw.numero}" inválido, ignorado`)
      }
      const starter = normalize(raw.titular)
      const hasStarter = headers.includes('titular')
      if (hasStarter && !['', 'S', 'SIM', 'N', 'NAO'].includes(starter)) {
        issue('warning', `Titular "${raw.titular}" inválido; considerado reserva`)
      }
      let player: CsvPlayer | null = null
      if (!issues.some(item => item.severity === 'error')) {
        if (number !== null) {
          const firstLine = firstNumberLines.get(number)
          if (firstLine !== undefined) issue('warning', `Número ${number} repetido (linha ${firstLine})`)
          else firstNumberLines.set(number, startLine)
        }
        player = {
          name: raw.nome, number, position, nickname: raw.apelido || null,
          isStarter: hasStarter ? starter === 'S' || starter === 'SIM' : validCount < 11,
        }
        validCount++
      }
      rows.push({ line: startLine, raw, player, issues })
    },
  })
  if (!headers) fileError('Arquivo vazio.')
  return fileIssues.length ? { rows: [], fileIssues } : { rows, fileIssues }
}

function normalize(value: string): string {
  return value.trim().normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()
}