import type { User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { authErrorMessage, type Credentials } from '@/lib/auth/credentials'
import { BOARD_STORAGE_KEY, serialize } from '@/lib/persistence'
import { getSupabase } from '@/lib/supabase/client'
import { deleteOwnAccount } from '@/lib/supabase/queries'
import { queryClient } from '@/queryClient'
import { cancelHistoryBatch, snapshotOf, useBoardStore } from './boardStore'
import { useToolStore } from './toolStore'

interface AuthState {
  user: User | null
}

export const useAuthStore = create<AuthState>()(() => ({ user: null }))

const BOARD_OWNER_KEY = 'prancheta-tatica:prancheta:dono'

function readBoardOwner(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(BOARD_OWNER_KEY)
  } catch {
    return null
  }
}

/** Dono da prancheta salva; sem dono, ela é de um visitante. */
let boardOwner = readBoardOwner()

/**
 * Quem usar este navegador depois não herda a prancheta nem o histórico de outra conta, mesmo que a
 * sessão tenha expirado com o app fechado. A prancheta de um visitante continua ao entrar na conta.
 */
export function claimBoard(userId: string | null) {
  const changedOwner = Boolean(boardOwner && boardOwner !== userId)
  if (changedOwner) {
    cancelHistoryBatch()
    useBoardStore.getState().clearBoard()
    useBoardStore.temporal.getState().clear()
    useToolStore.getState().resetTools()
  }
  boardOwner = userId
  try {
    if (typeof localStorage === 'undefined') return
    // Na hora, antes de trocar o dono: outra aba aberta agora não pode ler a prancheta antiga como de visitante.
    if (changedOwner) localStorage.setItem(BOARD_STORAGE_KEY, serialize(snapshotOf(useBoardStore.getState())))
    if (userId) localStorage.setItem(BOARD_OWNER_KEY, userId)
    else localStorage.removeItem(BOARD_OWNER_KEY)
  } catch {
    // Storage bloqueado: a prancheta também não fica salva, então não há o que proteger depois de fechar.
  }
}

function applySession(user: User | null) {
  const previousId = useAuthStore.getState().user?.id
  useAuthStore.setState({ user })
  // Renovar o token não troca de usuário: os dados continuam valendo.
  if (previousId === user?.id) return
  // Fora do callback de onAuthStateChange: chamar o Supabase dentro dele pode travar.
  setTimeout(() => {
    claimBoard(user?.id ?? null)
    void queryClient.resetQueries()
  }, 0)
}

/**
 * Descobre a sessão antes da primeira renderização. Se a lista de times carregasse antes dela, os times
 * privados pareceriam excluídos e useBoardSync limparia a prancheta. Qualquer falha vale como visitante.
 */
export async function initAuth(): Promise<void> {
  try {
    const supabase = getSupabase()
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user ?? null
    useAuthStore.setState({ user })
    claimBoard(user?.id ?? null)
    supabase.auth.onAuthStateChange((_event, session) => applySession(session?.user ?? null))
  } catch {
    useAuthStore.setState({ user: null })
    claimBoard(null)
  }
}

/** Vai para o Google e volta para a página atual. O autosave grava a prancheta ao sair da página. */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  })
  if (error) throw new Error('Não foi possível abrir o login do Google. Tente de novo.')
}

export async function signInWithPassword(credentials: Credentials): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword(credentials)
  if (error) throw new Error(authErrorMessage(error.code))
}

/** Sem confirmação de e-mail, o cadastro já abre a sessão. Sem sessão, a pessoa não entrou: não fingir sucesso. */
export async function signUpWithPassword(credentials: Credentials): Promise<void> {
  const { data, error } = await getSupabase().auth.signUp(credentials)
  if (error) throw new Error(authErrorMessage(error.code))
  if (!data.session) throw new Error('Não foi possível criar a conta. Se este e-mail já tem cadastro, use Entrar.')
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut({ scope: 'local' })
}

/** Apaga a conta com os times e as formações dela, e encerra a sessão neste navegador. */
export async function deleteAccount(): Promise<void> {
  await deleteOwnAccount()
  await signOut()
}

export function displayName(user: User): string {
  const name: unknown = user.user_metadata.full_name
  return typeof name === 'string' && name.trim() ? name.trim() : (user.email ?? 'Minha conta')
}
