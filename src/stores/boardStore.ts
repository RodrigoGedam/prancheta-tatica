import { create } from 'zustand'
import type { Point, Side } from '@/lib/geometry/pitch'
import type { Placement } from '@/lib/board/placement'

export const DEFAULT_FORMATION = '4-3-3'

export interface SideState {
  teamId: string | null
  /** Id de formação fixa ('4-3-3') ou uuid de formação custom. */
  formationId: string
  /** Cor alternativa que vale só na prancheta. */
  colorOverride: string | null
  /** Esconder: some do campo e o banco recolhe; as posições ficam guardadas. */
  hidden: boolean
  /** Já recebeu a formação inicial depois de escolher o time. */
  initialized: boolean
  /** Jogadores em campo; quem tem `z` maior fica por cima. */
  placements: Placement[]
}

interface BoardState {
  sides: Record<Side, SideState>
  /** Contador global de camadas, compartilhado pelos dois lados (empilhamento entre times). */
  nextZ: number
  setTeam: (side: Side, teamId: string | null) => void
  /** Substitui todos os jogadores em campo do lado (formação inicial, troca de formação, resetar). */
  setPlacements: (side: Side, placements: Omit<Placement, 'z'>[], formationId?: string) => void
  placePlayer: (side: Side, playerId: string, point: Point) => void
  removePlayer: (side: Side, playerId: string) => void
  /** Tira do campo quem não está mais no elenco. */
  prunePlacements: (side: Side, validIds: ReadonlySet<string>) => void
  /** Elenco reimportado (ids novos): o lado com esse time recebe a formação de novo. */
  resetTeam: (teamId: string) => void
  setFormationId: (side: Side, formationId: string) => void
  toggleHidden: (side: Side) => void
  setColorOverride: (side: Side, color: string | null) => void
}

const emptySide = (formationId = DEFAULT_FORMATION): SideState => ({
  teamId: null,
  formationId,
  colorOverride: null,
  hidden: false,
  initialized: false,
  placements: [],
})

export const useBoardStore = create<BoardState>()((set) => {
  const patch = (side: Side, fn: (s: SideState, nextZ: number) => Partial<SideState>, zUsed = 0) =>
    set((state) => ({
      sides: { ...state.sides, [side]: { ...state.sides[side], ...fn(state.sides[side], state.nextZ) } },
      nextZ: state.nextZ + zUsed,
    }))

  return {
    sides: { home: emptySide(), away: emptySide() },
    nextZ: 1,

    setTeam: (side, teamId) =>
      set((state) => ({
        sides: { ...state.sides, [side]: { ...emptySide(state.sides[side].formationId), teamId } },
      })),

    setPlacements: (side, placements, formationId) =>
      patch(
        side,
        (s, z) => ({
          placements: placements.map((p, i) => ({ ...p, z: z + i })),
          formationId: formationId ?? s.formationId,
          initialized: true,
        }),
        placements.length,
      ),

    placePlayer: (side, playerId, point) =>
      patch(
        side,
        (s, z) => ({
          placements: [...s.placements.filter((p) => p.playerId !== playerId), { playerId, x: point.x, y: point.y, z }],
        }),
        1,
      ),

    removePlayer: (side, playerId) =>
      patch(side, (s) => ({ placements: s.placements.filter((p) => p.playerId !== playerId) })),

    prunePlacements: (side, validIds) =>
      patch(side, (s) => ({ placements: s.placements.filter((p) => validIds.has(p.playerId)) })),

    resetTeam: (teamId) =>
      set((state) => {
        const sides = { ...state.sides }
        for (const side of ['home', 'away'] as const) {
          if (sides[side].teamId === teamId) sides[side] = { ...sides[side], initialized: false, placements: [] }
        }
        return { sides }
      }),

    setFormationId: (side, formationId) => patch(side, () => ({ formationId })),

    toggleHidden: (side) => patch(side, (s) => ({ hidden: !s.hidden })),

    setColorOverride: (side, color) => patch(side, () => ({ colorOverride: color })),
  }
})
