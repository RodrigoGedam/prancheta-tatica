import { describe, expect, it } from 'vitest'
import { starterProblem, type StarterRosterPlayer } from './starters'

const player = (id: string, position: string, is_starter = true): StarterRosterPlayer => ({
  id,
  name: `Jogador ${id}`,
  position,
  is_starter,
})
const eleven = [player('g', 'GOL'), ...Array.from({ length: 10 }, (_, i) => player(`l${i}`, 'MC'))]

describe('starterProblem', () => {
  it('reserva nunca tem problema', () => {
    expect(starterProblem(eleven, { id: null, position: 'GOL', is_starter: false })).toBeNull()
  })
  it('aceita até o 11º titular', () => {
    expect(starterProblem(eleven.slice(0, 10), { id: null, position: 'ATA', is_starter: true })).toBeNull()
  })
  it('recusa o 12º titular', () => {
    expect(starterProblem(eleven, { id: null, position: 'ATA', is_starter: true })).toMatch(/já tem 11 titulares/)
  })
  it('editar um dos 11 titulares não conta ele mesmo', () => {
    expect(starterProblem(eleven, { id: 'l0', position: 'ATA', is_starter: true })).toBeNull()
  })
  it('promover um reserva com 11 titulares é recusado', () => {
    const roster = [...eleven, player('r', 'ATA', false)]
    expect(starterProblem(roster, { id: 'r', position: 'ATA', is_starter: true })).toMatch(/já tem 11 titulares/)
  })
  it('recusa o segundo goleiro mesmo com menos de 11 titulares, citando o atual', () => {
    expect(starterProblem([player('g', 'GOL')], { id: null, position: 'GOL', is_starter: true })).toMatch(/Jogador g já é o goleiro titular/)
  })
  it('recusa titular de linha que muda para goleiro quando já há um', () => {
    expect(starterProblem(eleven, { id: 'l0', position: 'GOL', is_starter: true })).toMatch(/goleiro titular/)
  })
  it('o goleiro titular continua podendo ser editado', () => {
    expect(starterProblem(eleven, { id: 'g', position: 'GOL', is_starter: true })).toBeNull()
  })
  it('goleiro reserva não bloqueia outro goleiro titular', () => {
    expect(starterProblem([player('g', 'GOL', false)], { id: null, position: 'GOL', is_starter: true })).toBeNull()
  })
})
