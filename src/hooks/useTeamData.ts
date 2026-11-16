import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  copyTeam,
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
import type { ImportPlayer, PlayerInput, TeamFormInput, TeamInput } from '@/lib/supabase/schemas'
import { resetTeamEverywhere } from '@/stores/boardStore'

// Hooks do TanStack Query para times e jogadores. Leituras usam useQuery (cache por chave); escritas usam
// useMutation e, ao concluir, invalidam as chaves afetadas, o que faz o Query buscar os dados de novo.

/** Chaves do cache: a lista de times e o elenco de cada time, separado por id. */
export const teamKeys = {
  all: ['teams'] as const,
  players: (teamId: string) => ['players', teamId] as const,
}

/** Times visíveis para quem está logado (padrão e próprios) ou só os padrão, para visitantes. */
export function useTeams() {
  return useQuery({ queryKey: teamKeys.all, queryFn: fetchTeams })
}

/** Elenco de um time. Sem `teamId`, a consulta fica desligada (`enabled: false`) e não vai à rede. */
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
    mutationFn: (input: TeamFormInput) => createTeam(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TeamFormInput }) => updateTeam(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: (_data, id) => {
      // O elenco do time excluído sai do cache de vez (não há o que buscar de novo).
      qc.removeQueries({ queryKey: teamKeys.players(id) })
      return qc.invalidateQueries({ queryKey: teamKeys.all })
    },
  })
}

export function useCopyTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => copyTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  })
}

/** Mudou o elenco: recarrega os jogadores e também a lista de times, que traz a contagem de jogadores. */
function invalidateTeam(qc: ReturnType<typeof useQueryClient>, teamId: string) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: teamKeys.players(teamId) }),
    qc.invalidateQueries({ queryKey: teamKeys.all }),
  ])
}

/** Cria (`id` null) ou edita um jogador do time. */
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

/** Importa um CSV: cria o time ou, se já existe um com o mesmo nome, substitui o elenco inteiro. */
export function useImportTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ team, players }: { team: TeamInput; players: ImportPlayer[] }) => importTeam(team, players),
    onSuccess: async (teamId) => {
      await invalidateTeam(qc, teamId)
      // Ids dos jogadores mudaram: a prancheta remonta a formação com o elenco novo (já recarregado).
      resetTeamEverywhere(teamId)
    },
  })
}
