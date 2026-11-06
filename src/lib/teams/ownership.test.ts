import { describe, expect, it } from 'vitest'
import { groupTeams, isDefaultTeam } from './ownership'

const standard = { name: 'Padrão', user_id: null }
const owned = { name: 'Próprio', user_id: 'owner' }

describe('isDefaultTeam', () => {
  it('identifica padrão e time com dono', () => {
    expect(isDefaultTeam(standard)).toBe(true)
    expect(isDefaultTeam(owned)).toBe(false)
  })
})

describe('groupTeams', () => {
  it('aceita lista vazia', () => {
    expect(groupTeams([])).toEqual({ mine: [], defaults: [] })
  })

  it('aceita só padrão', () => {
    expect(groupTeams([standard])).toEqual({ mine: [], defaults: [standard] })
  })

  it('aceita só próprios', () => {
    expect(groupTeams([owned])).toEqual({ mine: [owned], defaults: [] })
  })

  it('preserva a ordem dos dois grupos sem mutar a entrada', () => {
    const otherStandard = Object.freeze({ name: 'Outro padrão', user_id: null })
    const otherOwned = Object.freeze({ name: 'Outro próprio', user_id: 'owner' })
    const teams = Object.freeze([Object.freeze(owned), Object.freeze(standard), otherStandard, otherOwned])
    const before = [...teams]
    const grouped = groupTeams(teams)
    expect(grouped).toEqual({ mine: [owned, otherOwned], defaults: [standard, otherStandard] })
    expect(teams).toEqual(before)
    expect(grouped.mine[0]).toBe(owned)
    expect(grouped.defaults[0]).toBe(standard)
  })
})
