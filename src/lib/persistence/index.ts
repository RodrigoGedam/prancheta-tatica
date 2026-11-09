import { z } from 'zod'
import type { Placement } from '@/lib/board/placement'
import type { Side } from '@/lib/geometry/pitch'
import { drawShapeSchema, type DrawShape } from '@/lib/geometry/shapes'

export const BOARD_STORAGE_KEY = 'prancheta-tatica:prancheta'
export const BOARD_SCHEMA_VERSION = 1
export const DEFAULT_FORMATION_ID = '4-3-3'
export interface PersistedSide {
  teamId: string | null
  formationId: string
  colorOverride: string | null
  initialized: boolean
  placements: Placement[]
}
export interface BoardSnapshot {
  sides: Record<Side, PersistedSide>
  hidden: Record<Side, boolean>
  nextZ: number
  shapes: DrawShape[]
}
export type Migration = (data: unknown) => unknown
export const MIGRATIONS: Readonly<Record<number, Migration>> = {}
export function emptySide(formationId: string = DEFAULT_FORMATION_ID): PersistedSide {
  return { teamId: null, formationId, colorOverride: null, initialized: false, placements: [] }
}
export function emptySnapshot(): BoardSnapshot {
  return { sides: { home: emptySide(), away: emptySide() }, hidden: { home: false, away: false }, nextZ: 1, shapes: [] }
}
const recordSchema = z.record(z.string(), z.unknown())
const nonempty = z.string().min(1)
const placementSchema = z.object({ playerId: nonempty, x: z.number().finite(), y: z.number().finite(), z: z.number().finite() })
function record(value: unknown): Record<string, unknown> {
  const result = recordSchema.safeParse(value)
  return result.success ? result.data : {}
}
function readSide(value: unknown): PersistedSide {
  const data = record(value)
  const side = emptySide(nonempty.safeParse(data.formationId).data)
  side.teamId = nonempty.safeParse(data.teamId).data ?? null
  side.colorOverride = z.string().regex(/^#[0-9a-f]{6}$/i).safeParse(data.colorOverride).data ?? null
  if (side.teamId === null) return side
  side.initialized = typeof data.initialized === 'boolean' ? data.initialized : false
  const placements = (Array.isArray(data.placements) ? data.placements : []).flatMap(value => {
    const parsed = placementSchema.safeParse(value)
    return parsed.success ? [parsed.data] : []
  })
  const winners = new Map<string, Placement>()
  for (const p of placements) {
    const previous = winners.get(p.playerId)
    if (!previous || p.z > previous.z) winners.set(p.playerId, p)
  }
  side.placements = placements.filter(p => winners.get(p.playerId) === p)
  return side
}
export function serialize(snapshot: BoardSnapshot): string {
  return JSON.stringify({ version: BOARD_SCHEMA_VERSION, data: snapshot })
}
export function deserialize(raw: string | null | undefined): BoardSnapshot {
  try {
    if (!raw) return emptySnapshot()
    const envelope = record(JSON.parse(raw))
    if (typeof envelope.version !== 'number') return emptySnapshot()
    const migrated = migrate(envelope.version, envelope.data)
    if (migrated === null) return emptySnapshot()
    const data = record(migrated)
    const sides = record(data.sides)
    const home = readSide(sides.home)
    let away = readSide(sides.away)
    if (home.teamId !== null && home.teamId === away.teamId) away = emptySide(away.formationId)
    const hidden = record(data.hidden)
    const ids = new Set<string>()
    const shapes = (Array.isArray(data.shapes) ? data.shapes : []).flatMap(value => {
      const parsed = drawShapeSchema.safeParse(value)
      // Texto vazio (salvo no meio da digitação) ficaria invisível e impossível de apagar.
      if (!parsed.success || ids.has(parsed.data.id) || (parsed.data.type === 'text' && parsed.data.text.trim() === '')) return []
      ids.add(parsed.data.id)
      return [parsed.data]
    })
    let maximum = 0
    for (const p of [...home.placements, ...away.placements]) maximum = Math.max(maximum, p.z)
    const nextZ = typeof data.nextZ === 'number' && Number.isInteger(data.nextZ) && data.nextZ >= 1 && data.nextZ > maximum
      ? data.nextZ : Math.floor(maximum) + 1
    return { sides: { home, away }, hidden: { home: hidden.home === true, away: hidden.away === true }, nextZ, shapes }
  } catch {
    return emptySnapshot()
  }
}
export function migrate(
  version: number,
  data: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target: number = BOARD_SCHEMA_VERSION,
): unknown | null {
  if (!Number.isInteger(version) || version < 1 || version > target) return null
  try {
    for (let current = version; current < target; current++) {
      const step = migrations[current]
      if (!step) return null
      data = step(data)
    }
    return data
  } catch {
    return null
  }
}
