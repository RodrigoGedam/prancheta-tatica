import { assignPlayersToSlots, slotPoint } from '@/lib/formations'
import type { Point, Side } from '@/lib/geometry/pitch'
import type { FormationSlot } from '@/lib/supabase/schemas'

/** Jogador em campo, em metros absolutos. Quem tem `z` maior fica por cima. */
export interface Placement {
  playerId: string
  x: number
  y: number
  z: number
}

export type PlacementInput = Omit<Placement, 'z'>

export interface BoardPlayer {
  id: string
  position: string
  is_starter: boolean
  sort_order: number
}

/** Distância (m) abaixo da qual soltar um jogador perto de outro o empilha. */
export const STACK_SNAP_DISTANCE = 2.5

/** Arredonda para evitar ruído de ponto flutuante nas comparações de pilha. */
const round = (n: number) => Math.round(n * 100) / 100

function bySortOrder<P extends BoardPlayer>(a: P, b: P): number {
  return a.sort_order - b.sort_order
}

/** Titulares (na ordem do elenco) nos slots da formação. Titulares que sobram ficam no banco. */
export function initialPlacements(
  players: readonly BoardPlayer[],
  slots: readonly FormationSlot[],
  side: Side,
): PlacementInput[] {
  const starters = players.filter((p) => p.is_starter).sort(bySortOrder)
  return assignPlayersToSlots(starters, slots).assigned.map(({ slot, player }) => {
    const point = slotPoint(slot, side)
    return { playerId: player.id, x: point.x, y: point.y }
  })
}

/**
 * Troca de formação: quem está em campo é redistribuído pelos slots novos (na ordem de camada);
 * quem sobra continua onde estava.
 */
export function reformPlacements(
  current: readonly Placement[],
  players: readonly BoardPlayer[],
  slots: readonly FormationSlot[],
  side: Side,
): PlacementInput[] {
  const byId = new Map(players.map((p) => [p.id, p]))
  const onPitch = [...current]
    .sort((a, b) => a.z - b.z)
    .flatMap((placement) => {
      const player = byId.get(placement.playerId)
      return player ? [{ ...player, placement }] : []
    })
  const { assigned, unassigned } = assignPlayersToSlots(onPitch, slots)
  return [
    ...assigned.map(({ slot, player }) => {
      const point = slotPoint(slot, side)
      return { playerId: player.id, x: point.x, y: point.y }
    }),
    ...unassigned.map(({ placement }) => ({ playerId: placement.playerId, x: placement.x, y: placement.y })),
  ]
}

/** Ponto do jogador mais próximo dentro de `maxDistance`, ou null. Usado para empilhar ao soltar. */
export function snapTarget(point: Point, others: readonly Point[], maxDistance = STACK_SNAP_DISTANCE): Point | null {
  let best: Point | null = null
  let bestDistance = maxDistance
  for (const other of others) {
    const d = Math.hypot(other.x - point.x, other.y - point.y)
    if (d < bestDistance) {
      best = other
      bestDistance = d
    }
  }
  return best ? { x: best.x, y: best.y } : null
}

export interface StackInfo {
  /** Quantos jogadores estão neste mesmo ponto (1 = sozinho). */
  size: number
  isTop: boolean
}

/** Agrupa coordenadas arredondadas a 0,01 m e marca o de maior `z` como topo. */
export function stackInfo(placements: readonly { id: string; x: number; y: number; z: number }[]): Map<string, StackInfo> {
  const groups = new Map<string, { id: string; z: number }[]>()
  for (const p of placements) {
    const key = `${round(p.x)},${round(p.y)}`
    const group = groups.get(key) ?? []
    group.push({ id: p.id, z: p.z })
    groups.set(key, group)
  }
  const info = new Map<string, StackInfo>()
  for (const group of groups.values()) {
    const top = group.reduce((a, b) => (b.z > a.z ? b : a))
    for (const item of group) info.set(item.id, { size: group.length, isTop: item.id === top.id })
  }
  return info
}

/** Iniciais para o token de quem não tem número (até 2 letras). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1] ?? '') : ''
  return ((first.charAt(0) + last.charAt(0)) || '?').toUpperCase()
}

/** O que aparece dentro do token: número, ou iniciais quando não há número. */
export function tokenMark(player: { number: number | null; name: string }): string {
  return player.number !== null ? String(player.number) : initials(player.name)
}
