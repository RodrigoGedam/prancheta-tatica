import type { TeamSummary } from '@/lib/supabase/queries'
import { useBoardStore } from '@/stores/boardStore'
import { useToolStore } from '@/stores/toolStore'

/** Os desenhos sumiram: não sobra seleção nem texto em edição. */
function dropShapeSelection() {
  const tools = useToolStore.getState()
  tools.select(null)
  tools.editText(null)
}

/** Apaga todos os desenhos; times e jogadores ficam como estão. */
export function clearDrawings() {
  useBoardStore.getState().clearShapes()
  dropShapeSelection()
}

/** Volta ao estado de quando os times foram escolhidos; useBoardSync remonta os titulares. */
export function restoreBoard(teams: readonly TeamSummary[]) {
  const board = useBoardStore.getState()
  const defaultFormation = (teamId: string | null) => teams.find((t) => t.id === teamId)?.default_formation
  board.restoreTeams({
    home: defaultFormation(board.sides.home.teamId),
    away: defaultFormation(board.sides.away.teamId),
  })
  dropShapeSelection()
}

/** Tudo como ao abrir a prancheta pela primeira vez, inclusive os times. */
export function restartBoard() {
  useBoardStore.getState().clearBoard()
  useToolStore.getState().resetTools()
}
