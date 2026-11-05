import type { PostgrestError } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSupabase } from './client'
import {
  importPlayerSchema,
  playerInputSchema,
  playerRowSchema,
  teamInputSchema,
  teamRowSchema,
  type ImportPlayer,
  type PlayerInput,
  type PlayerRow,
  type TeamInput,
  type TeamRow,
} from './schemas'

export interface TeamSummary extends TeamRow {
  playerCount: number
}

const teamWithCountSchema = teamRowSchema.extend({
  players: z.array(z.object({ count: z.number() })),
})

/** Erro com mensagem pronta para a interface. */
export class DataError extends Error {}

function toDataError(error: PostgrestError): DataError {
  if (error.code === '23505') return new DataError('Já existe um time com esse nome.')
  if (error.code === '23514') return new DataError('Algum valor está fora do formato aceito.')
  return new DataError(`Erro ao falar com o Supabase: ${error.message}`)
}

function check<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) throw toDataError(result.error)
  return result.data
}

export async function fetchTeams(): Promise<TeamSummary[]> {
  const data: unknown = check(
    await getSupabase().from('teams').select('*, players(count)').order('name', { ascending: true }),
  )
  return z
    .array(teamWithCountSchema)
    .parse(data)
    .map(({ players, ...team }) => ({ ...team, playerCount: players[0]?.count ?? 0 }))
}

export async function fetchPlayers(teamId: string): Promise<PlayerRow[]> {
  const data: unknown = check(
    await getSupabase()
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  )
  return z.array(playerRowSchema).parse(data)
}

export async function createTeam(input: TeamInput): Promise<TeamRow> {
  const values = teamInputSchema.parse(input)
  const data: unknown = check(await getSupabase().from('teams').insert(values).select().single())
  return teamRowSchema.parse(data)
}

export async function updateTeam(id: string, input: TeamInput): Promise<TeamRow> {
  const values = teamInputSchema.parse(input)
  const data: unknown = check(await getSupabase().from('teams').update(values).eq('id', id).select().single())
  return teamRowSchema.parse(data)
}

export async function deleteTeam(id: string): Promise<void> {
  check(await getSupabase().from('teams').delete().eq('id', id))
}

export async function createPlayer(teamId: string, input: PlayerInput, sortOrder: number): Promise<PlayerRow> {
  const values = playerInputSchema.parse(input)
  const data: unknown = check(
    await getSupabase()
      .from('players')
      .insert({ ...values, team_id: teamId, sort_order: sortOrder })
      .select()
      .single(),
  )
  return playerRowSchema.parse(data)
}

export async function updatePlayer(id: string, input: PlayerInput): Promise<PlayerRow> {
  const values = playerInputSchema.parse(input)
  const data: unknown = check(await getSupabase().from('players').update(values).eq('id', id).select().single())
  return playerRowSchema.parse(data)
}

export async function deletePlayer(id: string): Promise<void> {
  check(await getSupabase().from('players').delete().eq('id', id))
}

/** Cria o time ou substitui todos os jogadores do time de mesmo nome (sem diferenciar caixa), atomicamente. */
export async function importTeam(input: TeamInput, players: ImportPlayer[]): Promise<string> {
  const team = teamInputSchema.parse(input)
  const payload = z.array(importPlayerSchema).parse(players)
  const data: unknown = check(
    await getSupabase().rpc('import_team', { p_name: team.name, p_color: team.color, p_players: payload }),
  )
  return z.uuid().parse(data)
}
