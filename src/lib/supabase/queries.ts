/**
 * Acesso aos dados usado pelos hooks: valida respostas com Zod e traduz erros do banco.
 * A visibilidade e a permissão de escrita dependem da sessão e das políticas RLS.
 */
import type { PostgrestError } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSupabase } from './client'
import {
  formationRowSchema,
  importPlayerSchema,
  playerInputSchema,
  playerRowSchema,
  teamFormSchema,
  teamInputSchema,
  teamRowSchema,
  type FormationRow,
  type FormationSlot,
  type ImportPlayer,
  type PlayerInput,
  type PlayerRow,
  type TeamFormInput,
  type TeamInput,
  type TeamRow,
} from './schemas'

export interface TeamSummary extends TeamRow {
  playerCount: number
}

const teamWithCountSchema = teamRowSchema.extend({
  players: z.array(z.object({ count: z.number() })),
})
const formationColumns = 'id, name, slots, created_at, updated_at'

/** Erro com mensagem pronta para a interface. */
export class DataError extends Error {}

function toDataError(error: PostgrestError): DataError {
  // Códigos SQL: unicidade, restrição de valor e permissão; não dependem do idioma do servidor.
  if (error.code === '23505') return new DataError('Já existe um registro com esse nome.')
  if (error.code === '23514') return new DataError('Algum valor está fora do formato aceito.')
  if (error.code === '42501') return new DataError('Você não tem permissão para isso. Entre na sua conta e tente de novo.')
  // Regras do banco (raise exception) já vêm com a mensagem pronta, ex.: limite de titulares.
  if (error.code === 'P0001') return new DataError(error.message)
  return new DataError(`Erro ao falar com o Supabase: ${error.message}`)
}

function check<T>(result: { data: T; error: PostgrestError | null }): T {
  if (result.error) throw toDataError(result.error)
  return result.data
}

/** Lista os times visíveis com contagem de jogadores, em ordem de nome. */
export async function fetchTeams(): Promise<TeamSummary[]> {
  const data: unknown = check(
    await getSupabase().from('teams').select('*, players(count)').order('name', { ascending: true }),
  )
  return z
    .array(teamWithCountSchema)
    .parse(data)
    .map(({ players, ...team }) => ({ ...team, playerCount: players[0]?.count ?? 0 }))
}

/** Carrega o elenco na ordem salva, desempatando pela criação. */
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

/** Valida o formulário e cria um time para o dono definido pelo banco. */
export async function createTeam(input: TeamFormInput): Promise<TeamRow> {
  const values = teamFormSchema.parse(input)
  const data: unknown = check(await getSupabase().from('teams').insert(values).select().single())
  return teamRowSchema.parse(data)
}

/** Valida e salva os dados do time, incluindo a formação padrão. */
export async function updateTeam(id: string, input: TeamFormInput): Promise<TeamRow> {
  const values = teamFormSchema.parse(input)
  const data: unknown = check(await getSupabase().from('teams').update(values).eq('id', id).select().single())
  return teamRowSchema.parse(data)
}

/** Exclui o time; o banco também remove seu elenco por cascata. */
export async function deleteTeam(id: string): Promise<void> {
  check(await getSupabase().from('teams').delete().eq('id', id))
}

/** Valida o jogador e o adiciona ao time com a ordem informada. */
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

/** Valida e salva os dados do jogador; limites de titulares também são conferidos pelo banco. */
export async function updatePlayer(id: string, input: PlayerInput): Promise<PlayerRow> {
  const values = playerInputSchema.parse(input)
  const data: unknown = check(await getSupabase().from('players').update(values).eq('id', id).select().single())
  return playerRowSchema.parse(data)
}

/** Exclui o jogador do elenco; a reconciliação da prancheta cabe à camada de estado. */
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

/** Cria uma cópia privada do time para o usuário logado e devolve o id dela. */
export async function copyTeam(teamId: string): Promise<string> {
  const data: unknown = check(await getSupabase().rpc('copy_team', { p_team_id: teamId }))
  return z.uuid().parse(data)
}

/** Apaga o usuário logado; o banco leva junto os times e as formações dele. */
export async function deleteOwnAccount(): Promise<void> {
  check(await getSupabase().rpc('delete_own_account'))
}

/** Lista as formações customizadas visíveis à sessão, em ordem de nome. */
export async function fetchFormations(): Promise<FormationRow[]> {
  const data: unknown = check(await getSupabase().from('formations').select(formationColumns).order('name', { ascending: true }))
  return z.array(formationRowSchema).parse(data)
}

/** Salva vagas em metros na orientação do mandante e devolve a formação criada. */
export async function createFormation(name: string, slots: FormationSlot[]): Promise<FormationRow> {
  const data: unknown = check(
    await getSupabase().from('formations').insert({ name: name.trim(), slots }).select(formationColumns).single(),
  )
  return formationRowSchema.parse(data)
}

/** Altera apenas o nome, removendo espaços das pontas. */
export async function renameFormation(id: string, name: string): Promise<FormationRow> {
  const data: unknown = check(
    await getSupabase().from('formations').update({ name: name.trim() }).eq('id', id).select(formationColumns).single(),
  )
  return formationRowSchema.parse(data)
}

/** Exclui a formação customizada; a camada de estado trata referências na prancheta. */
export async function deleteFormation(id: string): Promise<void> {
  check(await getSupabase().from('formations').delete().eq('id', id))
}
