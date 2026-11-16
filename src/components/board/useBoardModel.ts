import { useEffect, useMemo } from 'react'
import { useFormationCatalog } from '@/hooks/useFormations'
import { usePlayers, useTeams } from '@/hooks/useTeamData'
import { initialPlacements, reformPlacements, snapTarget, type Placement } from '@/lib/board/placement'
import { contrastColor } from '@/lib/colors'
import type { FormationDef } from '@/lib/formations'
import type { Point, Side } from '@/lib/geometry/pitch'
import { sortByPosition } from '@/lib/players/sort'
import type { TeamSummary } from '@/lib/supabase/queries'
import type { FormationSlot, PlayerRow } from '@/lib/supabase/schemas'
import { useAuthStore } from '@/stores/authStore'
import {
  DEFAULT_FORMATION,
  forgetTeam,
  prunePlayersEverywhere,
  useBoardStore,
  withoutHistory,
  type SideState,
} from '@/stores/boardStore'

/**
 * Ponte entre o boardStore (só ids e coordenadas) e o cache do TanStack Query (times, elencos, formações).
 * `useSideModel` cruza os dois e entrega cada lado pronto para desenhar; `useBoardSync` faz o caminho
 * inverso e corrige o store quando os dados do servidor mudam (time ou jogador excluído).
 */
export const SIDE_LABEL: Record<Side, string> = { home: 'Mandante', away: 'Visitante' }

export interface PlacedPlayer {
  player: PlayerRow
  placement: Placement
}

export interface SideModel {
  side: Side
  state: SideState
  /** Esconder ativo (fora do histórico de desfazer). */
  hidden: boolean
  team: TeamSummary | undefined
  players: PlayerRow[]
  playersLoaded: boolean
  /** Cor do time na prancheta (com a alternativa, se houver). */
  color: string
  /** Cor do goleiro, escolhida para contrastar com a do time. */
  goalkeeperColor: string
  formation: FormationDef
  /** Formação custom ainda carregando: `formation` é só a substituta temporária. */
  formationPending: boolean
  onPitch: PlacedPlayer[]
  /** Quem não está em campo, ordenado por posição. */
  bench: PlayerRow[]
}

/** Lista vazia fixa: um `[]` novo a cada render mudaria a referência e refaria o useMemo à toa. */
const NO_PLAYERS: PlayerRow[] = []

/**
 * Modelo de um lado para o render: time, cores, formação, jogadores em campo e banco.
 * Placements de jogadores que não estão no elenco carregado são ignorados aqui (useBoardSync os remove).
 */
export function useSideModel(side: Side): SideModel {
  // Seletores (funções que escolhem um pedaço do store): o componente só re-renderiza quando esse pedaço muda.
  const state = useBoardStore((s) => s.sides[side])
  const hidden = useBoardStore((s) => s.hidden[side])
  const teams = useTeams()
  const players = usePlayers(state.teamId ?? undefined)
  const catalog = useFormationCatalog()

  return useMemo(() => {
    const team = teams.data?.find((t) => t.id === state.teamId)
    const list = team ? (players.data ?? NO_PLAYERS) : NO_PLAYERS
    const byId = new Map(list.map((p) => [p.id, p]))
    const onPitch = state.placements.flatMap((placement) => {
      const player = byId.get(placement.playerId)
      return player ? [{ player, placement }] : []
    })
    const placedIds = new Set(onPitch.map((p) => p.player.id))
    // Sem time, os tokens usam um tom neutro.
    const color = state.colorOverride ?? team?.color ?? '#A8928A'
    const formation = catalog.resolve(state.formationId)
    return {
      side,
      state,
      hidden,
      team,
      players: list,
      playersLoaded: Boolean(team) && players.isSuccess,
      color,
      goalkeeperColor: contrastColor(color),
      formation,
      // `resolve` devolve uma substituta quando o id não está no catálogo; enquanto ele carrega, é provisória.
      formationPending: !catalog.isSettled && formation.id !== state.formationId,
      onPitch,
      bench: sortByPosition(list.filter((p) => !placedIds.has(p.id))),
    }
  }, [side, state, hidden, teams.data, players.data, players.isSuccess, catalog])
}

/**
 * Ações que dependem dos dados do lado (formação, elenco): trocar a formação e voltar os titulares a ela.
 * `reset` é ignorado enquanto a formação custom carrega, para não montar na substituta.
 */
export function useSideActions(model: SideModel) {
  const catalog = useFormationCatalog()
  const { side } = model
  return useMemo(
    () => ({
      chooseFormation(formationId: string) {
        const store = useBoardStore.getState()
        // Sem time ou com o elenco ainda carregando: só guarda a escolha; useBoardSync monta quando chegar.
        if (!model.state.teamId || !model.playersLoaded || !store.sides[side].initialized) {
          return store.setFormationId(side, formationId)
        }
        applyFormation(side, formationId, model.players, catalog.resolve(formationId).slots)
      },
      reset() {
        if (model.formationPending) return
        useBoardStore
          .getState()
          .setPlacements(side, initialPlacements(model.players, model.formation.slots, side))
      },
    }),
    [catalog, model, side],
  )
}

/** Redistribui quem está em campo na formação (extras ficam onde estão). */
function applyFormation(side: Side, formationId: string, players: readonly PlayerRow[], slots: readonly FormationSlot[]) {
  const store = useBoardStore.getState()
  store.setPlacements(side, reformPlacements(store.sides[side].placements, players, slots, side), formationId)
}

/**
 * Solta um jogador no ponto, empilhando se cair perto de qualquer outro jogador visível (dos dois times).
 * Devolve o ponto final, para o canvas alinhar o nó arrastado mesmo quando as props não mudam.
 */
export function dropPlayer(side: Side, playerId: string, point: Point): Point {
  const store = useBoardStore.getState()
  const others = (['home', 'away'] as const).flatMap((s) =>
    store.hidden[s] ? [] : store.sides[s].placements.filter((p) => !(s === side && p.playerId === playerId)),
  )
  const target = snapTarget(point, others) ?? point
  store.placePlayer(side, playerId, target)
  return target
}

/**
 * Mantém o estado da prancheta coerente com os dados do Supabase. Chamar uma vez, na página.
 * Roda a cada mudança dos modelos ou das listas; só age quando as listas carregaram com a sessão conhecida.
 */
export function useBoardSync(models: readonly SideModel[]) {
  const teams = useTeams()
  const catalog = useFormationCatalog()
  // Sessão não conferida: as listas vêm como de visitante, e time ou formação privados pareceriam excluídos.
  const sessionKnown = useAuthStore((s) => !s.sessionUnknown)
  useEffect(() => {
    // Ajustes automáticos completam a ação do usuário que os provocou: não viram passos de desfazer.
    withoutHistory(() => syncSides(models, sessionKnown && teams.isSuccess, sessionKnown && catalog.isLoaded))
  }, [models, teams.isSuccess, catalog, sessionKnown])
}

/** Corrige cada lado conforme os dados carregados (ver useBoardSync). */
function syncSides(models: readonly SideModel[], teamsLoaded: boolean, catalogLoaded: boolean) {
  for (const m of models) {
    const store = useBoardStore.getState()
    // Time excluído em /times: limpa o lado.
    if (m.state.teamId && teamsLoaded && !m.team) {
      forgetTeam(m.state.teamId)
      continue
    }
    if (!m.team || !m.playersLoaded) continue
    if (!m.state.initialized) {
      // A formação padrão pode ser custom: espera o catálogo para não montar na formação errada.
      if (m.formationPending) continue
      // Primeira vez (ou elenco reimportado, ver resetTeamEverywhere): titulares na formação escolhida.
      store.setPlacements(m.side, initialPlacements(m.players, m.formation.slots, m.side))
      continue
    }
    // Jogador excluído em /times: tira do campo (senão vira um ponto invisível de empilhamento).
    const ids = new Set(m.players.map((p) => p.id))
    if (m.state.placements.some((p) => !ids.has(p.playerId))) prunePlayersEverywhere(m.team.id, ids)
    // Formação custom excluída: volta para a padrão e reposiciona (`m.formation` já é a substituta resolvida).
    if (catalogLoaded && m.formation.id !== m.state.formationId) {
      applyFormation(m.side, DEFAULT_FORMATION, m.players, m.formation.slots)
    }
  }
}
