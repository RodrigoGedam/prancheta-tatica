import { describe, expect, it } from 'vitest'
import { getFixedFormation } from '@/lib/formations'
import { mirror } from '@/lib/geometry/pitch'
import {
  initialPlacements,
  initials,
  reformPlacements,
  snapTarget,
  stackInfo,
  tokenMark,
  type BoardPlayer,
  type Placement,
} from './placement'

const f433 = getFixedFormation('4-3-3')!
const f442 = getFixedFormation('4-4-2')!
const POS_433 = ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'MC', 'VOL', 'MC', 'PD', 'ATA', 'PE']

function squad(positions: string[], starters = positions.length): BoardPlayer[] {
  return positions.map((position, i) => ({ id: `p${i}`, position, is_starter: i < starters, sort_order: i }))
}

describe('initialPlacements', () => {
  it('coloca só os titulares, cada um no slot da sua posição', () => {
    const players = squad([...POS_433, 'GOL', 'ATA'], 11)
    const result = initialPlacements(players, f433.slots, 'home')
    expect(result).toHaveLength(11)
    expect(result.map((r) => r.playerId)).not.toContain('p11')
    const gk = result.find((r) => r.playerId === 'p0')
    expect(gk).toMatchObject({ x: 34, y: 100 })
  })

  it('espelha para o visitante', () => {
    const players = squad(POS_433)
    const home = initialPlacements(players, f433.slots, 'home')
    const away = initialPlacements(players, f433.slots, 'away')
    for (const h of home) {
      const a = away.find((p) => p.playerId === h.playerId)!
      expect({ x: a.x, y: a.y }).toEqual(mirror(h))
    }
  })

  it('respeita sort_order e manda titulares extras para o banco', () => {
    const players = squad([...POS_433, 'ZAG'], 12).map((p, i) => ({ ...p, sort_order: 100 - i }))
    // Ordem invertida: o ZAG extra (p11) vem antes dos outros ZAG e fica com um slot.
    const ids = initialPlacements(players, f433.slots, 'home').map((r) => r.playerId)
    expect(ids).toContain('p11')
    expect(ids).toHaveLength(11)
  })
})

describe('reformPlacements', () => {
  it('redistribui quem está em campo e mantém onde estava quem sobra', () => {
    const players = squad([...POS_433, 'ATA'])
    const current: Placement[] = players.map((p, i) => ({ playerId: p.id, x: 1 + i, y: 60, z: i }))
    const result = reformPlacements(current, players, f442.slots, 'home')
    expect(result).toHaveLength(12)
    const slotPoints = new Set(f442.slots.map((s) => `${s.x},${s.y}`))
    const inSlots = result.filter((r) => slotPoints.has(`${r.x},${r.y}`))
    expect(inSlots).toHaveLength(11)
    const leftover = result.find((r) => !slotPoints.has(`${r.x},${r.y}`))!
    const before = current.find((c) => c.playerId === leftover.playerId)!
    expect({ x: leftover.x, y: leftover.y }).toEqual({ x: before.x, y: before.y })
  })

  it('ignora quem não está no elenco', () => {
    const players = squad(POS_433)
    const current: Placement[] = [{ playerId: 'fantasma', x: 10, y: 10, z: 1 }]
    expect(reformPlacements(current, players, f433.slots, 'home')).toEqual([])
  })
})

describe('snapTarget', () => {
  it('pega o mais próximo dentro da distância', () => {
    expect(snapTarget({ x: 10, y: 10 }, [{ x: 12, y: 10 }, { x: 11, y: 10 }])).toEqual({ x: 11, y: 10 })
  })
  it('null quando ninguém está perto', () => {
    expect(snapTarget({ x: 10, y: 10 }, [{ x: 20, y: 10 }])).toBeNull()
    expect(snapTarget({ x: 10, y: 10 }, [])).toBeNull()
  })
})

describe('stackInfo', () => {
  it('agrupa pontos iguais e marca o de maior z como topo', () => {
    const info = stackInfo([
      { id: 'a', x: 10, y: 10, z: 1 },
      { id: 'b', x: 10, y: 10, z: 5 },
      { id: 'c', x: 10.000001, y: 10, z: 3 },
      { id: 'd', x: 30, y: 30, z: 2 },
    ])
    expect(info.get('b')).toEqual({ size: 3, isTop: true })
    expect(info.get('a')).toEqual({ size: 3, isTop: false })
    expect(info.get('d')).toEqual({ size: 1, isTop: true })
  })
})

describe('tokenMark', () => {
  it('usa o número ou as iniciais', () => {
    expect(tokenMark({ number: 0, name: 'Zé' })).toBe('0')
    expect(tokenMark({ number: null, name: 'João Paulo Reis' })).toBe('JR')
    expect(initials('  ana ')).toBe('A')
    expect(initials('')).toBe('?')
  })
})
