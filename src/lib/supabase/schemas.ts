import { z } from 'zod'

export const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const teamName = z.string().trim().min(1, 'Informe o nome do time.').max(40, 'Use no máximo 40 caracteres.')
const playerName = z.string().trim().min(1, 'Informe o nome do jogador.').max(80, 'Use no máximo 80 caracteres.')
const color = z.string().regex(HEX_COLOR_REGEX, 'Cor inválida.')
const number = z.number({ error: 'Número deve ser de 0 a 99.' }).int('Número deve ser de 0 a 99.').min(0, 'Número deve ser de 0 a 99.').max(99, 'Número deve ser de 0 a 99.').nullable()

export const teamRowSchema = z.object({
  id: z.uuid(), user_id: z.uuid().nullable(), name: z.string().min(1).max(40), color, default_formation: z.string().min(1).max(40),
  created_at: z.string(), updated_at: z.string(),
})
export const playerRowSchema = z.object({
  id: z.uuid(), team_id: z.uuid(), name: z.string().min(1).max(80), number,
  position: z.string().min(1).max(10), nickname: z.string().max(40).nullable(),
  is_starter: z.boolean(), sort_order: z.number().int(), created_at: z.string(),
})
export const formationSlotSchema = z.object({
  slot: z.number().int().min(0).max(10), position: z.string().min(1).max(10),
  x: z.number(), y: z.number(),
})
export const formationRowSchema = z.object({
  id: z.uuid(), name: z.string().min(1).max(40),
  slots: z.array(formationSlotSchema).length(11).refine(
    (slots) => new Set(slots.map(({ slot }) => slot)).size === slots.length,
    'Os slots não podem se repetir.',
  ),
  created_at: z.string(), updated_at: z.string(),
})
export const teamInputSchema = z.object({ name: teamName, color })
/** Criar e editar pelo formulário; a importação por CSV não mexe na formação padrão. */
export const teamFormSchema = teamInputSchema.extend({
  default_formation: z.string().min(1, 'Escolha a formação padrão.').max(40),
})
export const playerInputSchema = z.object({
  name: playerName, number,
  position: z.string().trim().toUpperCase().min(1, 'Informe a posição.').max(10, 'Use no máximo 10 caracteres.'),
  nickname: z.string().trim().max(40, 'Use no máximo 40 caracteres.').nullable().transform((value) => value === '' ? null : value),
  is_starter: z.boolean({ error: 'Informe se o jogador é titular.' }),
})
export const importPlayerSchema = playerInputSchema

export type TeamRow = z.output<typeof teamRowSchema>
export type PlayerRow = z.output<typeof playerRowSchema>
export type FormationSlot = z.output<typeof formationSlotSchema>
export type FormationRow = z.output<typeof formationRowSchema>
export type TeamInput = z.output<typeof teamInputSchema>
export type TeamFormInput = z.output<typeof teamFormSchema>
export type PlayerInput = z.output<typeof playerInputSchema>
export type ImportPlayer = z.output<typeof importPlayerSchema>
