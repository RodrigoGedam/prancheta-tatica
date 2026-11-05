import { describe, expect, it } from 'vitest'
import { POSITIONS, isPosition } from './positions'

describe('positions', () => {
  it('tem as 15 posições da especificação', () => {
    expect(POSITIONS).toHaveLength(15)
  })
  it('reconhece posições válidas e rejeita as demais', () => {
    expect(isPosition('GOL')).toBe(true)
    expect(isPosition('gol')).toBe(false)
    expect(isPosition('LAT')).toBe(false)
  })
})
