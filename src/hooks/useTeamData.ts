import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPlayer,
  createTeam,
  deletePlayer,
  deleteTeam,
  fetchPlayers,
  fetchTeams,
  importTeam,
  updatePlayer,
  updateTeam,
} from '@/lib/supabase/queries'
import type { ImportPlayer, PlayerInput, TeamInput } from '@/lib/supabase/schemas'
import { useBoardStore } from '@/stores/boardStore'

export const teamKeys = {
  all: ['teams'] as const,
  players: (teamId: string) => ['players', teamId] as const,
}

export function useTeams() {
  return useQuery({ queryKey: teamKeys.all, queryFn: fetchTeams })
}

export function usePlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: teamKeys.players(teamId ?? ''),
    queryFn: () => fetchPlayers(teamId ?? ''),
    enabled: Boolean(teamId),
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TeamInput) => createTeam(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamInput }) => updateTeam(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: teamKeys.players(id) })
      return qc.invalidateQueries({ queryKey: teamKeys.all })
    },
  })
}

function invalidateTeam(qc: ReturnType<typeof useQueryClient>, teamId: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: teamKeys.players(teamId) }),
    qc.invalidateQueries({ queryKey: teamKeys.all }),
  ])
}

export function useSavePlayer(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input, sortOrder }: { id: string | null; input: PlayerInput; sortOrder: number }) =>
      id ? updatePlayer(id, input) : createPlayer(teamId, input, sortOrder),
    onSuccess: () => invalidateTeam(qc, teamId),
  })
}

export function useDeletePlayer(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePlayer(id),
    onSuccess: () => invalidateTeam(qc, teamId),
  })
}

export function useImportTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ team, players }: { team: TeamInput; players: ImportPlayer[] }) => importTeam(team, players),
    onSuccess: async (teamId) => {
      await invalidateTeam(qc, teamId)
      // Ids dos jogadores mudaram: a prancheta remonta a formação com o elenco novo (já recarregado).
      useBoardStore.getState().resetTeam(teamId)
    },
  })
}
