import { PITCH, mirror, isInsidePitch, type Point, type Side } from '@/lib/geometry/pitch'
import { formationSlotSchema, type FormationSlot } from '@/lib/supabase/schemas'
import { isPosition, type Position } from '@/lib/positions'

export type FixedFormationId = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2'

/** Formação sempre definida para o time de BAIXO (mandante), em metros. */
export interface FormationDef {
  id: string
  name: string
  slots: FormationSlot[]
}

function formation(id: FixedFormationId, rows: readonly (readonly [string, number, number])[]): FormationDef {
  return { id, name: id, slots: rows.map(([position, x, y], slot) => ({ slot, position, x, y })) }
}

const center = PITCH.width / 2
export const FIXED_FORMATIONS: readonly FormationDef[] = [
  formation('4-4-2', [
    ['GOL', center, 100], ['LD', 60, 88], ['ZAG', 44, 88], ['ZAG', 24, 88], ['LE', 8, 88],
    ['MD', 60, 74], ['MC', 44, 74], ['MC', 24, 74], ['ME', 8, 74], ['ATA', 44, 58], ['ATA', 24, 58],
  ]),
  formation('4-3-3', [
    ['GOL', center, 100], ['LD', 60, 88], ['ZAG', 44, 88], ['ZAG', 24, 88], ['LE', 8, 88],
    ['MC', 46, 74], ['VOL', center, 80], ['MC', 22, 74], ['PD', 60, 58], ['ATA', center, 58], ['PE', 8, 58],
  ]),
  formation('4-2-3-1', [
    ['GOL', center, 100], ['LD', 60, 88], ['ZAG', 44, 88], ['ZAG', 24, 88], ['LE', 8, 88],
    ['VOL', 44, 80], ['VOL', 24, 80], ['PD', 60, 66], ['MEI', center, 66], ['PE', 8, 66], ['ATA', center, 58],
  ]),
  formation('3-5-2', [
    ['GOL', center, 100], ['ZAG', 46, 88], ['ZAG', center, 88], ['ZAG', 22, 88],
    ['ALD', 60, 78], ['VOL', center, 80], ['MC', center, 73], ['MEI', center, 66], ['ALE', 8, 78], ['ATA', 44, 58], ['ATA', 24, 58],
  ]),
  formation('5-3-2', [
    ['GOL', center, 100], ['ALD', 60, 88], ['ZAG', 46, 88], ['ZAG', center, 88], ['ZAG', 22, 88], ['ALE', 8, 88],
    ['MC', 46, 74], ['VOL', center, 80], ['MC', 22, 74], ['ATA', 44, 58], ['ATA', 24, 58],
  ]),
]

export function getFixedFormation(id: string): FormationDef | undefined {
  return FIXED_FORMATIONS.find(formation => formation.id === id)
}

/** Espelha os slots para o time de cima. Não altera a entrada. */
export function mirrorFormation(formation: FormationDef): FormationDef {
  return { ...formation, slots: formation.slots.map(slot => ({ ...slot, ...mirror(slot) })) }
}

/** Coordenada de um slot no lado pedido (home = como está; away = espelhado). */
export function slotPoint(slot: FormationSlot, side: Side): Point {
  return side === 'away' ? mirror(slot) : { x: slot.x, y: slot.y }
}

export interface AssignablePlayer {
  id: string
  position: string
}

export interface SlotAssignment<P extends AssignablePlayer> {
  slot: FormationSlot
  player: P
}

export interface AssignmentResult<P extends AssignablePlayer> {
  assigned: SlotAssignment<P>[]
  /** Jogadores que sobraram (mais jogadores que slots), na ordem de entrada. */
  unassigned: P[]
}

const compatible: Record<Position, readonly Position[]> = {
  GOL: [], LD: ['ALD', 'MD'], LE: ['ALE', 'ME'], ALD: ['LD', 'MD', 'PD'], ALE: ['LE', 'ME', 'PE'],
  ZAG: ['VOL'], VOL: ['MC', 'ZAG'], MC: ['VOL', 'MEI'], MEI: ['MC', 'SA'],
  MD: ['ALD', 'PD', 'MC'], ME: ['ALE', 'PE', 'MC'], PD: ['MD', 'SA', 'ATA'],
  PE: ['ME', 'SA', 'ATA'], SA: ['MEI', 'ATA'], ATA: ['SA', 'PD', 'PE'],
}

export function assignPlayersToSlots<P extends AssignablePlayer>(
  players: readonly P[],
  slots: readonly FormationSlot[],
): AssignmentResult<P> {
  const used = new Set<number>()
  const assignments = new Map<number, P>()
  const fill = (index: number, matches: (player: P) => boolean) => {
    if (assignments.has(index)) return
    const playerIndex = players.findIndex((player, i) => !used.has(i) && matches(player))
    if (playerIndex < 0) return
    used.add(playerIndex)
    assignments.set(index, players[playerIndex]!)
  }
  slots.forEach((slot, i) => {
    if (isPosition(slot.position)) fill(i, player => player.position === slot.position)
  })
  for (let rank = 0; rank < 3; rank++) {
    slots.forEach((slot, i) => {
      if (!isPosition(slot.position)) return
      const position = compatible[slot.position][rank]
      if (position !== undefined) fill(i, player => player.position === position)
    })
  }
  const remainingOrder = slots.map((slot, i) => ({ slot, i }))
  for (const { i } of remainingOrder.filter(({ slot }) => slot.position !== 'GOL')) {
    fill(i, player => player.position !== 'GOL')
    fill(i, () => true)
  }
  for (const { i } of remainingOrder.filter(({ slot }) => slot.position === 'GOL')) fill(i, () => true)
  return {
    assigned: slots.flatMap((slot, i) => {
      const player = assignments.get(i)
      return player === undefined ? [] : [{ slot, player }]
    }),
    unassigned: players.filter((_, i) => !used.has(i)),
  }
}

export type ValidationResult = { ok: true; slots: FormationSlot[] } | { ok: false; errors: string[] }

export function validateCustomFormation(slots: unknown): ValidationResult {
  if (!Array.isArray(slots)) return { ok: false, errors: ['Formato de formação inválido.'] }
  const errors: string[] = []
  const parsed: FormationSlot[] = []
  const records: Record<string, unknown>[] = []
  let invalidFormat = false
  let invalidSlot = false
  for (const entry of slots as unknown[]) {
    const result = formationSlotSchema.safeParse(entry)
    if (result.success) parsed.push(result.data)
    else {
      if (result.error.issues.some(issue => issue.path[0] !== 'slot')) invalidFormat = true
    }
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      invalidFormat = true
      continue
    }
    const record = entry as Record<string, unknown>
    records.push(record)
    if (typeof record.slot !== 'number' || !Number.isInteger(record.slot) || record.slot < 0 || record.slot > 10) invalidSlot = true
  }
  if (invalidFormat) errors.push('Formato de formação inválido.')
  if (slots.length !== 11) errors.push(`A formação precisa ter exatamente 11 jogadores (tem ${slots.length}).`)
  if (records.filter(entry => entry.position === 'GOL').length !== 1) errors.push('A formação precisa ter exatamente um goleiro.')
  if (invalidSlot || new Set(records.map(entry => entry.slot)).size !== records.length) errors.push('Slots repetidos ou inválidos.')
  const positions = new Set(records.map(entry => entry.position))
  for (const position of positions) {
    if (typeof position === 'string' && !isPosition(position)) errors.push(`Posição "${position}" inválida.`)
  }
  if (records.some(entry => typeof entry.x === 'number' && typeof entry.y === 'number' && !isInsidePitch({ x: entry.x, y: entry.y }, 0))) errors.push('Há jogadores fora do campo.')
  return errors.length ? { ok: false, errors } : { ok: true, slots: parsed.sort((a, b) => a.slot - b.slot) }
}

export interface PlacedEntry {
  position: string
  /** Ponto absoluto no campo, no lado em que o time está. */
  point: Point
}

/** Monta os slots de uma formação custom a partir dos jogadores em campo (normalizando para o time de baixo). */
export function buildCustomSlots(entries: readonly PlacedEntry[], side: Side): FormationSlot[] {
  return entries.map(entry => {
    const point = side === 'away' ? mirror(entry.point) : entry.point
    return { position: entry.position.toUpperCase(), x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 }
  }).sort((a, b) => {
    if ((a.position === 'GOL') !== (b.position === 'GOL')) return a.position === 'GOL' ? -1 : 1
    return Math.abs(a.y - b.y) < 0.5 ? b.x - a.x : b.y - a.y
  }).map((entry, slot) => ({ ...entry, slot }))
}
