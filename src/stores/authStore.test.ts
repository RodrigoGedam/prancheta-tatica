import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DrawShape } from '@/lib/geometry/shapes'
import { claimBoard, initAuth, useAuthStore } from './authStore'
import { beginHistoryBatch, endHistoryBatch, undo, useBoardStore } from './boardStore'

type AuthListener = (event: string, session: { user: { id: string } } | null) => void

const auth = vi.hoisted(() => ({
  result: { data: { session: null as { user: { id: string } } | null }, error: null as Error | null },
  listener: null as AuthListener | null,
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      getSession: () => Promise.resolve(auth.result),
      onAuthStateChange: (listener: AuthListener) => {
        auth.listener = listener
      },
    },
  }),
}))

const style = { color: '#FFFFFF', width: 'medium', dashed: false } as const
const arrow: DrawShape = { id: 'a', type: 'arrow', style, from: { x: 0, y: 0 }, to: { x: 10, y: 0 } }
const board = () => useBoardStore.getState()
/** applySession age num setTimeout(0). */
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  claimBoard(null)
  board().clearBoard()
  useBoardStore.temporal.getState().clear()
  useAuthStore.setState({ user: null, sessionUnknown: false })
  auth.result = { data: { session: null }, error: null }
  auth.listener = null
})

describe('sessão ao abrir o app', () => {
  it('sem sessão e sem erro, a prancheta de outra conta é limpa', async () => {
    claimBoard('A')
    board().addShape(arrow)
    await initAuth()
    expect(board().shapes).toEqual([])
    expect(useAuthStore.getState().sessionUnknown).toBe(false)
  })

  it('erro ao conferir a sessão mantém a prancheta, mesmo com o evento inicial vazio', async () => {
    claimBoard('A')
    board().addShape(arrow)
    auth.result = { data: { session: null }, error: new AuthRetryableFetchError('sem rede', 0) }
    await initAuth()
    auth.listener?.('INITIAL_SESSION', null)
    await nextTick()
    expect(board().shapes).toHaveLength(1)
    expect(useAuthStore.getState().sessionUnknown).toBe(true)
  })

  it('erro definitivo (token recusado) vale como saída e limpa a prancheta', async () => {
    claimBoard('A')
    board().addShape(arrow)
    auth.result = { data: { session: null }, error: new AuthApiError('recusado', 400, 'refresh_token_not_found') }
    await initAuth()
    expect(board().shapes).toEqual([])
    expect(useAuthStore.getState().sessionUnknown).toBe(false)
  })

  it('depois do erro, a mesma conta voltando mantém a prancheta', async () => {
    claimBoard('A')
    board().addShape(arrow)
    auth.result = { data: { session: null }, error: new AuthRetryableFetchError('sem rede', 0) }
    await initAuth()
    auth.listener?.('TOKEN_REFRESHED', { user: { id: 'A' } })
    // Até as listas de visitante serem descartadas, a sincronização continua parada.
    expect(useAuthStore.getState().sessionUnknown).toBe(true)
    await nextTick()
    expect(board().shapes).toHaveLength(1)
    expect(useAuthStore.getState().sessionUnknown).toBe(false)
  })

  it('depois do erro, a saída confirmada limpa a prancheta', async () => {
    claimBoard('A')
    board().addShape(arrow)
    auth.result = { data: { session: null }, error: new AuthRetryableFetchError('sem rede', 0) }
    await initAuth()
    auth.listener?.('SIGNED_OUT', null)
    await nextTick()
    expect(board().shapes).toEqual([])
  })
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
