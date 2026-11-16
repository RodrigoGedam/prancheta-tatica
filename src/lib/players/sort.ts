import { POSITIONS } from '@/lib/positions'

export type PlayerSortColumn = 'number' | 'name' | 'position'

export interface PlayerSort {
  column: PlayerSortColumn
  desc: boolean
}

export interface SortablePlayer {
  name: string
  number: number | null
  position: string
  is_starter: boolean
}

export const DEFAULT_PLAYER_SORT: PlayerSort = { column: 'position', desc: false }

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

/** Compara em português, ignorando caixa/acentos e tratando sequências de dígitos como números. */
export function compareNames(a: string, b: string): number {
  return collator.compare(a, b)
}

/** Segue a ordem de POSITIONS; posições desconhecidas vêm depois, em ordem alfabética. */
export function comparePositions(a: string, b: string): number {
  const rank = (position: string) => {
    const index = (POSITIONS as readonly string[]).indexOf(position)
    return index === -1 ? POSITIONS.length : index
  }
  return rank(a) - rank(b) || compareNames(a, b)
}

/** Crescente, com jogador sem número por último. */
function compareNumbers(a: number | null, b: number | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a - b
}

/** Mesma coluna inverte a direção; outra coluna começa em ordem crescente. */
export function togglePlayerSort(current: PlayerSort, column: PlayerSortColumn): PlayerSort {
  return current.column === column ? { column, desc: !current.desc } : { column, desc: false }
}

function comparePrimary(a: SortablePlayer, b: SortablePlayer, sort: PlayerSort): number {
  const direction = sort.desc ? -1 : 1
  if (sort.column === 'position') return direction * comparePositions(a.position, b.position)
  if (sort.column === 'name') return direction * compareNames(a.name, b.name)
  // Jogador sem número fica por último nas duas direções.
  if (a.number === null || b.number === null) return compareNumbers(a.number, b.number)
  return direction * compareNumbers(a.number, b.number)
}

/** Ordem do banco da prancheta: só posição, depois número e nome, sem separar titulares. */
export function sortByPosition<P extends Pick<SortablePlayer, 'name' | 'number' | 'position'>>(players: readonly P[]): P[] {
  return [...players].sort(
    (a, b) =>
      comparePositions(a.position, b.position) ||
      compareNumbers(a.number, b.number) ||
      compareNames(a.name, b.name),
  )
}

/** Titulares sempre primeiro; dentro de cada grupo vale a coluna escolhida. Desempata por número e nome. */
export function sortPlayers<P extends SortablePlayer>(players: readonly P[], sort: PlayerSort): P[] {
  return [...players].sort(
    (a, b) =>
      Number(b.is_starter) - Number(a.is_starter) ||
      comparePrimary(a, b, sort) ||
      compareNumbers(a.number, b.number) ||
      compareNames(a.name, b.name),
  )
}
