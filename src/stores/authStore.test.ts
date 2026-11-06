import { beforeEach, describe, expect, it } from 'vitest'
import type { DrawShape } from '@/lib/geometry/shapes'
import { claimBoard } from './authStore'
import { beginHistoryBatch, endHistoryBatch, undo, useBoardStore } from './boardStore'

const style = { color: '#FFFFFF', width: 'medium', dashed: false } as const
const arrow: DrawShape = { id: 'a', type: 'arrow', style, from: { x: 0, y: 0 }, to: { x: 10, y: 0 } }
const board = () => useBoardStore.getState()

beforeEach(() => {
  claimBoard(null)
  board().clearBoard()
  useBoardStore.temporal.getState().clear()
})

describe('dono da prancheta', () => {
  it('a prancheta do visitante continua ao entrar na conta', () => {
    board().addShape(arrow)
    claimBoard('A')
    expect(board().shapes).toHaveLength(1)
  })

  it('sair da conta limpa a prancheta e o histórico', () => {
    claimBoard('A')
    board().addShape(arrow)
    claimBoard(null)
    expect(board().shapes).toEqual([])
    expect(useBoardStore.temporal.getState().pastStates).toEqual([])
  })

  it('a mesma conta mantém a prancheta', () => {
    claimBoard('A')
    board().addShape(arrow)
    claimBoard('A')
    expect(board().shapes).toHaveLength(1)
  })

  it('trocar direto de conta limpa a prancheta', () => {
    claimBoard('A')
    board().addShape(arrow)
    claimBoard('B')
    expect(board().shapes).toEqual([])
  })

  it('um gesto em andamento ao sair não devolve a prancheta pelo desfazer', () => {
    claimBoard('A')
    board().addShape(arrow)
    beginHistoryBatch()
    board().removeShape('a')
    claimBoard(null)
    endHistoryBatch()
    undo()
    expect(board().shapes).toEqual([])
    expect(useBoardStore.temporal.getState().isTracking).toBe(true)
  })
})
