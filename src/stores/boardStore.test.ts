import { beforeEach, describe, expect, it } from 'vitest'
import { prunePlayersEverywhere, resetTeamEverywhere, useBoardStore } from './boardStore'

const s = () => useBoardStore.getState()

beforeEach(() => {
  s().setTeam('home', null)
  s().setTeam('away', null)
})

describe('boardStore', () => {
  it('placePlayer move o jogador para o topo da pilha (z maior)', () => {
    s().setTeam('home', 't1')
    s().setPlacements('home', [
      { playerId: 'a', x: 10, y: 10 },
      { playerId: 'b', x: 20, y: 20 },
    ])
    s().placePlayer('home', 'a', { x: 20, y: 20 })
    const [first, second] = s().sides.home.placements
    expect(second?.playerId).toBe('a')
    expect(second!.z).toBeGreaterThan(first!.z)
  })

  it('setFormationId sozinho não marca o lado como inicializado', () => {
    s().setTeam('home', 't1')
    s().setFormationId('home', '4-4-2')
    expect(s().sides.home).toMatchObject({ formationId: '4-4-2', initialized: false, placements: [] })
  })

  it('setTeam usa a formação padrão do time quando informada', () => {
    s().setTeam('home', 't1')
    s().setFormationId('home', '4-4-2')
    s().setTeam('home', 't2', '3-5-2')
    expect(s().sides.home).toMatchObject({ teamId: 't2', formationId: '3-5-2', initialized: false })
    s().setFormationId('home', '4-3-3')
  })
  it('setTeam mantém a formação e limpa o resto', () => {
    s().setTeam('home', 't1')
    s().setFormationId('home', '5-3-2')
    s().toggleHidden('home')
    s().setTeam('home', 't2')
    expect(s().sides.home).toMatchObject({ teamId: 't2', formationId: '5-3-2', initialized: false })
    expect(s().hidden.home).toBe(false)
  })

  it('prunePlayersEverywhere tira só quem saiu do elenco', () => {
    s().setTeam('home', 't1')
    s().setPlacements('home', [
      { playerId: 'a', x: 1, y: 1 },
      { playerId: 'b', x: 2, y: 2 },
    ])
    prunePlayersEverywhere('t1', new Set(['b']))
    expect(s().sides.home.placements.map((p) => p.playerId)).toEqual(['b'])
    expect(s().sides.home.initialized).toBe(true)
  })

  it('resetTeamEverywhere reinicializa só o lado com aquele time', () => {
    s().setTeam('home', 't1')
    s().setTeam('away', 't2')
    s().setPlacements('home', [{ playerId: 'a', x: 1, y: 1 }])
    s().setPlacements('away', [{ playerId: 'b', x: 1, y: 1 }])
    resetTeamEverywhere('t1')
    expect(s().sides.home).toMatchObject({ initialized: false, placements: [] })
    expect(s().sides.away.placements).toHaveLength(1)
  })
})
