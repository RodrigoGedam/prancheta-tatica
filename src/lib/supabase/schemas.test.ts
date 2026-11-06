import { describe, expect, it } from 'vitest'
import { formationRowSchema, importPlayerSchema, playerInputSchema, playerRowSchema, teamFormSchema, teamInputSchema, teamRowSchema } from './schemas'

const id = '550e8400-e29b-41d4-a716-446655440000'
const timestamp = '2026-11-05T12:34:56.123456+00:00'
const player = { name: 'Jogador', number: null, position: 'mc', nickname: '', is_starter: false }
const formation = {
  id, name: 'Customizada', created_at: timestamp, updated_at: timestamp,
  slots: Array.from({ length: 11 }, (_, slot) => ({ slot, position: 'MC', x: 34, y: 70 })),
}

describe('linhas do banco', () => {
  it('aceita timestamps PostgREST nas três tabelas', () => {
    expect(teamRowSchema.safeParse({ id, name: 'Time', color: '#aAbB00', default_formation: '4-3-3', created_at: timestamp, updated_at: timestamp }).success).toBe(true)
    expect(playerRowSchema.safeParse({ ...player, id, team_id: id, nickname: null, sort_order: 0, created_at: timestamp }).success).toBe(true)
    expect(formationRowSchema.safeParse(formation).success).toBe(true)
  })
  it('rejeita dez slots', () => {
    expect(formationRowSchema.safeParse({ ...formation, slots: formation.slots.slice(1) }).success).toBe(false)
  })
  it('rejeita slots repetidos', () => {
    expect(formationRowSchema.safeParse({ ...formation, slots: formation.slots.map((slot) => ({ ...slot, slot: 0 })) }).success).toBe(false)
  })
})
describe('entradas de time', () => {
  it('remove espaços do nome', () => {
    expect(teamInputSchema.parse({ name: ' Time ', color: '#123456' }).name).toBe('Time')
  })
  it.each(['', '   ', 'a'.repeat(41)])('rejeita nome inválido %j', (name) => {
    expect(teamInputSchema.safeParse({ name, color: '#123456' }).success).toBe(false)
  })
  it.each(['#FFF', 'blue'])('rejeita cor %s', (color) => {
    expect(teamInputSchema.safeParse({ name: 'Time', color }).success).toBe(false)
  })
})
describe('formulário de time', () => {
  it('exige a formação padrão', () => {
    expect(teamFormSchema.safeParse({ name: 'Time', color: '#123456' }).success).toBe(false)
    expect(teamFormSchema.parse({ name: 'Time', color: '#123456', default_formation: '3-5-2' }).default_formation).toBe('3-5-2')
  })
})
describe('entradas de jogador', () => {
  it('normaliza posição e apelido e aceita número nulo', () => {
    expect(playerInputSchema.parse({ ...player, position: ' mc ', nickname: '  ' })).toEqual({ ...player, position: 'MC', nickname: null })
  })
  it.each([100, 1.5, -1])('rejeita número %s', (number) => {
    expect(playerInputSchema.safeParse({ ...player, number }).success).toBe(false)
  })
  it('valida o payload de importação com o mesmo contrato', () => {
    expect(importPlayerSchema.parse(player)).toEqual(playerInputSchema.parse(player))
  })
})
