import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOARD_STORAGE_KEY, deserialize } from '@/lib/persistence'
import type { DrawShape } from '@/lib/geometry/shapes'
import { startAutosave } from './autosave'
import {
  DEFAULT_FORMATION,
  beginHistoryBatch,
  endHistoryBatch,
  forgetTeam,
  prunePlayersEverywhere,
  redo,
  resetTeamEverywhere,
  undo,
  useBoardStore,
  withoutHistory,
} from './boardStore'

const s = () => useBoardStore.getState()
const past = () => useBoardStore.temporal.getState().pastStates.length
const future = () => useBoardStore.temporal.getState().futureStates.length
const style = { color: '#FFFFFF', width: 'medium', dashed: false } as const
const arrow = (id: string, x = 0): DrawShape => ({ id, type: 'arrow', style, from: { x, y: 0 }, to: { x: x + 10, y: 0 } })

beforeEach(() => {
  withoutHistory(() => {
    s().setTeam('home', null)
    s().setTeam('away', null)
    useBoardStore.setState({ shapes: [], hidden: { home: false, away: false } })
  })
  useBoardStore.temporal.getState().clear()
})

describe('limpar e resetar a prancheta', () => {
  const setUp = () => {
    s().setTeam('home', 't1', '4-3-3')
    s().setTeam('away', 't2', '4-3-3')
    s().setFormationId('home', '4-4-2')
    s().setColorOverride('home', '#000000')
    s().setPlacements('home', [{ playerId: 'a', x: 1, y: 1 }])
    s().setPlacements('away', [{ playerId: 'b', x: 2, y: 2 }])
    s().addShape(arrow('x'))
    s().toggleHidden('away')
    useBoardStore.temporal.getState().clear()
  }

  it('clearShapes apaga os desenhos, mantém o resto e é um passo só', () => {
    setUp()
    const sides = s().sides
    s().addShape(arrow('y'))
    useBoardStore.temporal.getState().clear()
    s().clearShapes()
    expect(s().shapes).toEqual([])
    expect(s().sides).toBe(sides)
    expect(s().hidden.away).toBe(true)
    expect(past()).toBe(1)
    undo()
    expect(s().shapes.map((shape) => shape.id)).toEqual(['x', 'y'])
  })

  it('clearShapes sem desenhos não cria passo', () => {
    s().clearShapes()
    expect(past()).toBe(0)
  })

  it('restoreTeams mantém os times e volta à formação padrão, sem desenhos, cor alternativa nem Esconder', () => {
    setUp()
    s().restoreTeams({ home: '3-5-2', away: '5-3-2' })
    expect(s().sides.home).toEqual({ teamId: 't1', formationId: '3-5-2', colorOverride: null, initialized: false, placements: [] })
    expect(s().sides.away).toEqual({ teamId: 't2', formationId: '5-3-2', colorOverride: null, initialized: false, placements: [] })
    expect(s().shapes).toEqual([])
    expect(s().hidden).toEqual({ home: false, away: false })
  })

  it('restoreTeams é um passo só de desfazer, mesmo com a formação montada depois', () => {
    setUp()
    s().restoreTeams({ home: '3-5-2', away: '5-3-2' })
    withoutHistory(() => s().setPlacements('home', [{ playerId: 'c', x: 3, y: 3 }]))
    expect(past()).toBe(1)
    undo()
    expect(s().sides.home).toMatchObject({ teamId: 't1', formationId: '4-4-2', colorOverride: '#000000' })
    expect(s().sides.home.placements.map((p) => p.playerId)).toEqual(['a'])
    expect(s().shapes).toHaveLength(1)
  })

  it('restoreTeams não mexe no lado sem time e, sem nada para resetar, não cria passo', () => {
    s().setFormationId('home', '4-4-2')
    useBoardStore.temporal.getState().clear()
    s().restoreTeams({})
    expect(s().sides.home.formationId).toBe('4-4-2')
    expect(past()).toBe(0)
  })

  it('clearBoard tira também os times e pode ser desfeito', () => {
    setUp()
    s().clearBoard()
    expect(s().sides.home).toEqual({ teamId: null, formationId: DEFAULT_FORMATION, colorOverride: null, initialized: false, placements: [] })
    expect(s().sides.away.teamId).toBeNull()
    expect(s().shapes).toEqual([])
    expect(s().hidden).toEqual({ home: false, away: false })
    expect(past()).toBe(1)
    undo()
    expect(s().sides.home.teamId).toBe('t1')
    expect(s().sides.away.placements).toHaveLength(1)
    expect(s().shapes).toHaveLength(1)
  })

  it('clearBoard com a prancheta vazia não cria passo', () => {
    withoutHistory(() => {
      s().setFormationId('home', DEFAULT_FORMATION)
      s().setFormationId('away', DEFAULT_FORMATION)
    })
    useBoardStore.setState({ hidden: { home: true, away: false } })
    useBoardStore.temporal.getState().clear()
    s().clearBoard()
    expect(past()).toBe(0)
    expect(s().hidden).toEqual({ home: false, away: false })
  })
})

describe('histórico', () => {
  it('desfaz e refaz desenhos e jogadores num histórico só', () => {
    s().setTeam('home', 't1')
    s().addShape(arrow('a'))
    s().placePlayer('home', 'p1', { x: 5, y: 5 })
    expect(past()).toBe(3)
    undo()
    expect(s().sides.home.placements).toHaveLength(0)
    expect(s().shapes).toHaveLength(1)
    undo()
    expect(s().shapes).toHaveLength(0)
    redo()
    redo()
    expect(s().shapes).toHaveLength(1)
    expect(s().sides.home.placements).toHaveLength(1)
  })

  it('Esconder não entra no histórico e não é revertido pelo desfazer', () => {
    s().setTeam('home', 't1')
    s().toggleHidden('home')
    expect(past()).toBe(1)
    undo()
    expect(s().sides.home.teamId).toBeNull()
    expect(s().hidden.home).toBe(true)
  })

  it('ajustes automáticos não criam passos e o refazer devolve o estado completo', () => {
    s().setTeam('home', 't1')
    withoutHistory(() => s().setPlacements('home', [{ playerId: 'p1', x: 1, y: 1 }]))
    expect(past()).toBe(1)
    undo()
    expect(s().sides.home.teamId).toBeNull()
    redo()
    expect(s().sides.home).toMatchObject({ teamId: 't1', initialized: true })
    expect(s().sides.home.placements).toHaveLength(1)
  })

  it('ajuste automático não apaga o refazer', () => {
    s().addShape(arrow('a'))
    undo()
    withoutHistory(() => s().prunePlacements('home', new Set()))
    expect(future()).toBe(1)
  })

  it('um gesto em lote vira um passo só', () => {
    s().addShape(arrow('a'))
    s().addShape(arrow('b', 20))
    s().addShape(arrow('c', 40))
    beginHistoryBatch()
    s().removeShape('a')
    s().removeShape('b')
    endHistoryBatch()
    expect(past()).toBe(4)
    expect(s().shapes.map((x) => x.id)).toEqual(['c'])
    undo()
    expect(s().shapes.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('lote sem mudança não cria passo, e ação nova limpa o refazer', () => {
    s().addShape(arrow('a'))
    beginHistoryBatch()
    endHistoryBatch()
    expect(past()).toBe(1)
    undo()
    expect(future()).toBe(1)
    beginHistoryBatch()
    s().addShape(arrow('b'))
    endHistoryBatch()
    expect(future()).toBe(0)
  })

  it('desfazer no meio de um gesto é ignorado até o gesto terminar', () => {
    s().addShape(arrow('a'))
    beginHistoryBatch()
    s().removeShape('a')
    undo()
    expect(s().shapes).toHaveLength(0)
    endHistoryBatch()
    expect(past()).toBe(2)
    undo()
    expect(s().shapes.map((x) => x.id)).toEqual(['a'])
  })

  it('time excluído some também do histórico, sem passos vazios', () => {
    s().setTeam('home', 't1')
    s().addShape(arrow('a'))
    forgetTeam('t1')
    expect(s().sides.home.teamId).toBeNull()
    undo()
    expect(s().shapes).toHaveLength(0)
    expect(s().sides.home.teamId).toBeNull()
    expect(past()).toBe(0)
  })

  it('jogador excluído sai também dos estados do histórico', () => {
    s().setTeam('home', 't1')
    s().placePlayer('home', 'p1', { x: 1, y: 1 })
    s().placePlayer('home', 'p2', { x: 2, y: 2 })
    prunePlayersEverywhere('t1', new Set(['p2']))
    expect(s().sides.home.placements.map((p) => p.playerId)).toEqual(['p2'])
    undo()
    expect(s().sides.home.placements.map((p) => p.playerId)).toEqual([])
    redo()
    expect(s().sides.home.placements.map((p) => p.playerId)).toEqual(['p2'])
  })

  it('limpar o histórico preserva estados repetidos separados por outras ações', () => {
    s().setTeam('away', 't2')
    s().addShape(arrow('a'))
    s().addShape(arrow('b', 20))
    s().removeShape('b')
    forgetTeam('t2')
    undo()
    expect(s().shapes.map((sh) => sh.id)).toEqual(['a', 'b'])
    undo()
    expect(s().shapes.map((sh) => sh.id)).toEqual(['a'])
    undo()
    expect(s().shapes).toEqual([])
    redo()
    redo()
    expect(s().shapes.map((sh) => sh.id)).toEqual(['a', 'b'])
    redo()
    expect(s().shapes.map((sh) => sh.id)).toEqual(['a'])
  })

  it('movimentos de um jogador excluído não deixam passos vazios (mesmo com nextZ diferente)', () => {
    s().setTeam('home', 't1')
    s().placePlayer('home', 'p2', { x: 2, y: 2 })
    s().placePlayer('home', 'p1', { x: 1, y: 1 })
    s().placePlayer('home', 'p1', { x: 3, y: 3 })
    s().placePlayer('home', 'p1', { x: 4, y: 4 })
    s().addShape(arrow('a'))
    prunePlayersEverywhere('t1', new Set(['p2']))
    undo()
    expect(s().shapes).toEqual([])
    expect(s().sides.home.placements.map((p) => p.playerId)).toEqual(['p2'])
    undo()
    expect(s().sides.home.placements).toEqual([])
    expect(s().sides.home.teamId).toBe('t1')
    expect(past()).toBe(1)
  })

  it('texto criado e cancelado no mesmo gesto não deixa passo vazio', () => {
    s().addShape(arrow('a'))
    beginHistoryBatch()
    s().addShape({ id: 't', type: 'text', style, x: 0, y: 0, text: '', fontSize: 2 })
    s().removeShape('t')
    endHistoryBatch()
    expect(past()).toBe(1)
  })

  it('reimportar o elenco reinicia o lado também no histórico', () => {
    s().setTeam('home', 't1')
    withoutHistory(() => s().setPlacements('home', [{ playerId: 'old', x: 1, y: 1 }]))
    s().placePlayer('home', 'old', { x: 9, y: 9 })
    s().addShape(arrow('a'))
    undo()
    resetTeamEverywhere('t1')
    expect(s().sides.home).toMatchObject({ teamId: 't1', initialized: false, placements: [] })
    const all = [...useBoardStore.temporal.getState().pastStates, ...useBoardStore.temporal.getState().futureStates]
    for (const st of all) {
      if (st.sides?.home.teamId === 't1') expect(st.sides.home.placements).toEqual([])
    }
    undo()
    expect(s().sides.home.placements).toEqual([])
    expect(s().sides.home.initialized).toBe(false)
  })

  it('ações que não mudam nada não criam passos', () => {
    s().removeShape('nao-existe')
    s().updateShape(arrow('nao-existe'))
    expect(past()).toBe(0)
  })
})

describe('autosave', () => {
  afterEach(() => vi.useRealTimers())

  it('grava com debounce e grava o pendente ao parar', () => {
    vi.useFakeTimers()
    const data = new Map<string, string>()
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    } as unknown as Storage
    const stop = startAutosave(storage, 400)
    s().addShape(arrow('a'))
    s().toggleHidden('away')
    expect(data.has(BOARD_STORAGE_KEY)).toBe(false)
    vi.advanceTimersByTime(400)
    const saved = deserialize(data.get(BOARD_STORAGE_KEY))
    expect(saved.shapes.map((x) => x.id)).toEqual(['a'])
    expect(saved.hidden.away).toBe(true)
    s().addShape(arrow('b', 20))
    stop()
    expect(deserialize(data.get(BOARD_STORAGE_KEY)).shapes).toHaveLength(2)
  })

  it('sem storage (bloqueado), o autosave não faz nada', () => {
    const stop = startAutosave(null)
    s().addShape(arrow('a'))
    expect(() => stop()).not.toThrow()
  })

  it('storage cheio não quebra a prancheta', () => {
    vi.useFakeTimers()
    const storage = {
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
    } as unknown as Storage
    const stop = startAutosave(storage, 10)
    s().addShape(arrow('a'))
    expect(() => vi.advanceTimersByTime(10)).not.toThrow()
    stop()
  })
})
