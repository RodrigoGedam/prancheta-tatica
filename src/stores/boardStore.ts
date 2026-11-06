import { create } from 'zustand'
import { temporal } from 'zundo'
import type { Point, Side } from '@/lib/geometry/pitch'
import type { Placement } from '@/lib/board/placement'
import type { DrawShape } from '@/lib/geometry/shapes'
import {
  BOARD_STORAGE_KEY,
  DEFAULT_FORMATION_ID,
  deserialize,
  emptySide,
  emptySnapshot,
  type BoardSnapshot,
  type PersistedSide,
} from '@/lib/persistence'

export const DEFAULT_FORMATION = DEFAULT_FORMATION_ID

/**
 * Estado de um lado: `teamId`, `formationId` (fixa '4-3-3' ou uuid custom), `colorOverride` (só na prancheta),
 * `initialized` (já recebeu a formação inicial) e `placements` (z maior fica por cima).
 */
export type SideState = PersistedSide

interface BoardState {
  sides: Record<Side, SideState>
  /** Esconder: some do campo e o banco recolhe; as posições ficam guardadas. Fora do histórico de desfazer. */
  hidden: Record<Side, boolean>
  /** Contador global de camadas, compartilhado pelos dois lados (empilhamento entre times). */
  nextZ: number
  /** Desenhos (camada própria, independente dos times), na ordem de desenho. */
  shapes: DrawShape[]
  /** Troca o time. `formationId` é a formação padrão do time; sem ela, o lado mantém a atual. */
  setTeam: (side: Side, teamId: string | null, formationId?: string) => void
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
  addShape: (shape: DrawShape) => void
  updateShape: (shape: DrawShape) => void
  removeShape: (id: string) => void
  /** Apaga todos os desenhos; times e jogadores ficam como estão. */
  clearShapes: () => void
  /** Mantém os times e volta ao estado de quando foram escolhidos, na formação padrão de cada um, sem desenhos. */
  restoreTeams: (formations: Partial<Record<Side, string>>) => void
  /** Volta a prancheta ao estado vazio, inclusive os times escolhidos. */
  clearBoard: () => void
}

/** O que entra no histórico de desfazer (tudo menos Esconder). */
type Tracked = Pick<BoardState, 'sides' | 'nextZ' | 'shapes'>

const HISTORY_LIMIT = 100

const partialize = (s: BoardState): Tracked => ({ sides: s.sides, nextZ: s.nextZ, shapes: s.shapes })

/** As ações sempre criam objetos novos quando mudam algo; comparar referências basta. */
const sameTracked = (a: Tracked, b: Tracked) => a.sides === b.sides && a.nextZ === b.nextZ && a.shapes === b.shapes

/** Comparação por conteúdo, para o fim de um gesto (ex.: texto criado e cancelado não deixa passo vazio). */
const sameContent = (a: Tracked, b: Tracked) => sameTracked(a, b) || JSON.stringify(a) === JSON.stringify(b)

/** Prancheta salva pelo autosave (ou vazia, se não houver ou estiver corrompida). */
function loadSnapshot(): BoardSnapshot {
  try {
    return typeof localStorage === 'undefined' ? emptySnapshot() : deserialize(localStorage.getItem(BOARD_STORAGE_KEY))
  } catch {
    return emptySnapshot()
  }
}

/** Estado salvo a partir do estado do store. */
export function snapshotOf(s: Pick<BoardState, 'sides' | 'hidden' | 'nextZ' | 'shapes'>): BoardSnapshot {
  return { sides: s.sides, hidden: s.hidden, nextZ: s.nextZ, shapes: s.shapes }
}

export const useBoardStore = create<BoardState>()(
  temporal(
    (set) => {
      const patch = (side: Side, fn: (s: SideState, nextZ: number) => Partial<SideState>, zUsed = 0) =>
        set((state) => ({
          sides: { ...state.sides, [side]: { ...state.sides[side], ...fn(state.sides[side], state.nextZ) } },
          nextZ: state.nextZ + zUsed,
        }))

      return {
        ...loadSnapshot(),

        addShape: (shape) => set((state) => ({ shapes: [...state.shapes, shape] })),
        updateShape: (shape) =>
          set((state) =>
            state.shapes.some((s) => s.id === shape.id)
              ? { shapes: state.shapes.map((s) => (s.id === shape.id ? shape : s)) }
              : state,
          ),
        removeShape: (id) =>
          set((state) => (state.shapes.some((s) => s.id === id) ? { shapes: state.shapes.filter((s) => s.id !== id) } : state)),

        clearShapes: () => set((state) => (state.shapes.length > 0 ? { shapes: [] } : state)),

        restoreTeams: (formations) =>
          set((state) => {
            const restore = (side: Side): SideState => {
              const s = state.sides[side]
              return s.teamId ? { ...emptySide(formations[side] ?? s.formationId), teamId: s.teamId } : s
            }
            const home = restore('home')
            const away = restore('away')
            return {
              // Sem time e sem desenho, as referências não mudam e não nasce passo de desfazer.
              sides: home === state.sides.home && away === state.sides.away ? state.sides : { home, away },
              shapes: state.shapes.length > 0 ? [] : state.shapes,
              hidden: { home: false, away: false },
            }
          }),

        clearBoard: () =>
          set((state) => {
            const empty = emptySnapshot()
            // Já vazia: só Esconder (fora do histórico) pode mudar, então não nasce passo de desfazer.
            return visibleKey(state) === visibleKey(empty) ? { hidden: empty.hidden } : empty
          }),

        setTeam: (side, teamId, formationId) =>
          set((state) => ({
            sides: { ...state.sides, [side]: { ...emptySide(formationId ?? state.sides[side].formationId), teamId } },
            hidden: { ...state.hidden, [side]: false },
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

        resetTeam: (teamId) => set((state) => ({ sides: mapSides(state.sides, resetIfTeam(teamId)) })),

        setFormationId: (side, formationId) => patch(side, () => ({ formationId })),

        toggleHidden: (side) => set((state) => ({ hidden: { ...state.hidden, [side]: !state.hidden[side] } })),

        setColorOverride: (side, color) => patch(side, () => ({ colorOverride: color })),
      }
    },
    { partialize, equality: sameTracked, limit: HISTORY_LIMIT },
  ),
)

const history = () => useBoardStore.temporal.getState()

/**
 * Roda mudanças automáticas (sincronização com o Supabase, formação inicial ao carregar o elenco)
 * sem criar passos no histórico: elas completam a ação do usuário que as provocou.
 */
export function withoutHistory(fn: () => void) {
  const wasTracking = history().isTracking
  if (wasTracking) history().pause()
  try {
    fn()
  } finally {
    if (wasTracking) history().resume()
  }
}

let batch: { before: Tracked; wasTracking: boolean } | null = null

/** Começa um gesto que vira um passo só no histórico (borracha passando, ponto de controle, edição de texto). */
export function beginHistoryBatch() {
  if (batch) return
  batch = { before: partialize(useBoardStore.getState()), wasTracking: history().isTracking }
  history().pause()
}

/** Fecha o gesto: se algo mudou, registra o estado de antes como um único passo. */
export function endHistoryBatch() {
  if (!batch) return
  const { before, wasTracking } = batch
  batch = null
  if (!wasTracking) return
  history().resume()
  if (sameContent(before, partialize(useBoardStore.getState()))) return
  useBoardStore.temporal.setState({
    pastStates: [...history().pastStates, before].slice(-HISTORY_LIMIT),
    futureStates: [],
  })
}

/** Abandona o gesto em andamento: o estado guardado nele nunca volta para o histórico. */
export function cancelHistoryBatch() {
  if (!batch) return
  const { wasTracking } = batch
  batch = null
  if (wasTracking) history().resume()
}

type SideRewrite = (side: SideState) => SideState

/** Aplica `fn` aos dois lados; devolve o mesmo objeto se nada mudou. */
function mapSides(sides: Record<Side, SideState>, fn: SideRewrite): Record<Side, SideState> {
  const home = fn(sides.home)
  const away = fn(sides.away)
  return home === sides.home && away === sides.away ? sides : { home, away }
}

const resetIfTeam = (teamId: string): SideRewrite => (s) =>
  s.teamId === teamId ? { ...s, initialized: false, placements: [] } : s
const clearIfTeam = (teamId: string): SideRewrite => (s) => (s.teamId === teamId ? emptySide(s.formationId) : s)
const pruneIfTeam = (teamId: string, validIds: ReadonlySet<string>): SideRewrite => (s) =>
  s.teamId === teamId && s.placements.some((p) => !validIds.has(p.playerId))
    ? { ...s, placements: s.placements.filter((p) => validIds.has(p.playerId)) }
    : s

/**
 * Dados mudaram fora da prancheta (time/jogador excluído, elenco reimportado): corrige o estado atual
 * (sem passo novo) e também os estados guardados no histórico, para desfazer/refazer não trazer de volta
 * o que não existe mais. Passos que ficaram iguais ao vizinho (ou ao atual) são descartados.
 */
function rewriteEverywhere(fn: SideRewrite) {
  withoutHistory(() =>
    useBoardStore.setState((st) => {
      const sides = mapSides(st.sides, fn)
      if (sides === st.sides) return st
      const hidden = { ...st.hidden }
      for (const side of ['home', 'away'] as const) {
        if (sides[side] !== st.sides[side] && sides[side].teamId === null) hidden[side] = false
      }
      return { sides, hidden }
    }),
  )
  const scrub = <T extends Partial<Tracked>>(state: T): T => {
    if (!state.sides) return state
    const sides = mapSides(state.sides, fn)
    return sides === state.sides ? state : { ...state, sides }
  }
  if (batch) batch = { ...batch, before: scrub(batch.before) }
  const now = visibleKey(partialize(useBoardStore.getState()))
  const { pastStates, futureStates } = history()
  // As duas pilhas terminam junto do estado atual (fim de pastStates = próximo desfazer; fim de
  // futureStates = próximo refazer). Só repetições vizinhas saem: um estado igual a outro mais
  // distante pode ser um passo legítimo (ex.: criar e apagar uma flecha).
  useBoardStore.temporal.setState({
    pastStates: collapseTowards(pastStates.map(scrub), now),
    futureStates: collapseTowards(futureStates.map(scrub), now),
  })
}

/** O que aparece na prancheta; `nextZ` fica de fora (movimentos de um jogador excluído só mudariam ele). */
const visibleKey = (state: Partial<Tracked>) => JSON.stringify({ sides: state.sides, shapes: state.shapes })

/**
 * `states` em ordem cronológica, terminando junto do estado atual (`anchor`): remove cada estado igual
 * ao vizinho seguinte (o último é comparado com o atual), para cada desfazer/refazer mudar algo visível.
 */
function collapseTowards(states: Partial<Tracked>[], anchor: string): Partial<Tracked>[] {
  const kept: Partial<Tracked>[] = []
  let next = anchor
  for (let i = states.length - 1; i >= 0; i--) {
    const state = states[i]
    if (!state) continue
    const key = visibleKey(state)
    if (key === next) continue
    kept.push(state)
    next = key
  }
  return kept.reverse()
}

/** Elenco reimportado (ids novos): o lado com esse time recebe a formação de novo, também no histórico. */
export function resetTeamEverywhere(teamId: string) {
  rewriteEverywhere(resetIfTeam(teamId))
}

/** Time excluído em /times: limpa o lado, também no histórico. */
export function forgetTeam(teamId: string) {
  rewriteEverywhere(clearIfTeam(teamId))
}

/** Jogadores excluídos em /times: saem do campo, também no histórico. */
export function prunePlayersEverywhere(teamId: string, validIds: ReadonlySet<string>) {
  rewriteEverywhere(pruneIfTeam(teamId, validIds))
}

/** Desfazer no meio de um gesto é ignorado: o gesto continua mexendo no store e viraria vários passos. */
export function undo() {
  if (batch) return
  history().undo()
}

export function redo() {
  if (batch) return
  history().redo()
}
