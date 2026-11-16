/**
 * Sessão do usuário (Supabase Auth, e-mail e senha) e as ações de entrar, cadastrar, sair e excluir conta.
 * Também decide de quem é a prancheta salva no navegador (`claimBoard`) e lida com a sessão que não
 * pôde ser conferida por falta de rede (`sessionUnknown`). `initAuth` roda em `main.tsx` antes do render.
 */
import { isAuthRetryableFetchError, type User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { authErrorMessage, signInSchema, signUpSchema, type Credentials, type SignUpCredentials } from '@/lib/auth/credentials'
import { BOARD_STORAGE_KEY, serialize } from '@/lib/persistence'
import { getSupabase } from '@/lib/supabase/client'
import { deleteOwnAccount } from '@/lib/supabase/queries'
import { queryClient } from '@/queryClient'
import { cancelHistoryBatch, snapshotOf, useBoardStore } from './boardStore'
import { useToolStore } from './toolStore'

interface AuthState {
  user: User | null
  /** A sessão não pôde ser conferida (ex.: sem rede): ainda não dá para concluir que a pessoa saiu da conta. */
  sessionUnknown: boolean
}

export const useAuthStore = create<AuthState>()(() => ({ user: null, sessionUnknown: false }))

/** Chave do localStorage com o id do dono da prancheta salva (ausente = visitante). */
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
 * Passa a prancheta para `userId` (null = visitante). Se ela tinha outro dono, prancheta, histórico e
 * ferramentas são limpos: quem usar este navegador depois não herda o trabalho de outra conta, mesmo que
 * a sessão tenha expirado com o app fechado. A prancheta de um visitante continua ao entrar na conta.
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

/** Reage a uma mudança de sessão (login, logout, renovação): troca o dono e recarrega os dados. */
function applySession(user: User | null) {
  const { user: previous, sessionUnknown } = useAuthStore.getState()
  useAuthStore.setState({ user })
  // Renovar o token não troca de usuário: os dados continuam valendo. Depois de uma sessão não conferida,
  // o primeiro evento é a resposta que faltava e sempre decide o dono da prancheta.
  if (!sessionUnknown && previous?.id === user?.id) return
  // Fora do callback de onAuthStateChange: chamar o Supabase dentro dele pode travar.
  setTimeout(() => {
    claimBoard(user?.id ?? null)
    // Descarta todo o cache do TanStack Query: times e formações visíveis dependem de quem está logado.
    void queryClient.resetQueries()
    // Só depois de descartar as listas lidas como visitante: com elas, useBoardSync tiraria os times privados.
    useAuthStore.setState({ sessionUnknown: false })
  }, 0)
}

/**
 * Descobre a sessão antes da primeira renderização. Se a lista de times carregasse antes dela, os times
 * privados pareceriam excluídos e useBoardSync limparia a prancheta. Uma falha de rede (com a sessão
 * vencida) não prova que a pessoa saiu: a prancheta fica como está até o Supabase responder.
 */
export async function initAuth(): Promise<void> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.getSession()
    // Só falha de rede é provisória (o Supabase tenta de novo e avisa). Qualquer outro erro, como um
    // token de renovação recusado, já encerrou a sessão: vale como saída.
    if (error && isAuthRetryableFetchError(error)) {
      useAuthStore.setState({ user: null, sessionUnknown: true })
    } else {
      const user = data.session?.user ?? null
      useAuthStore.setState({ user, sessionUnknown: false })
      claimBoard(user?.id ?? null)
    }
    supabase.auth.onAuthStateChange((event, session) => {
      // A sessão inicial já foi lida acima; depois de um erro, este evento viria vazio e limparia a prancheta.
      if (event !== 'INITIAL_SESSION') applySession(session?.user ?? null)
    })
  } catch {
    useAuthStore.setState({ user: null, sessionUnknown: true })
  }
}

/** Entra com e-mail e senha; lança Error com a mensagem em português. A sessão chega por onAuthStateChange. */
export async function signInWithPassword(credentials: Credentials): Promise<void> {
  const parsed = signInSchema.parse(credentials)
  const { error } = await getSupabase().auth.signInWithPassword(parsed)
  if (error) throw new Error(authErrorMessage(error.code))
}

/** Sem confirmação de e-mail, o cadastro já abre a sessão. Sem sessão, a pessoa não entrou: não fingir sucesso. */
export async function signUpWithPassword(credentials: SignUpCredentials): Promise<void> {
  const { name, email, password } = signUpSchema.parse(credentials)
  const { data, error } = await getSupabase().auth.signUp({ email, password, options: { data: { full_name: name } } })
  if (error) throw new Error(authErrorMessage(error.code))
  if (!data.session) throw new Error('Não foi possível criar a conta. Se este e-mail já tem cadastro, use Entrar.')
}

/** Sai só neste navegador (`scope: 'local'`); outras sessões da conta continuam abertas. */
export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut({ scope: 'local' })
}

/** Apaga a conta com os times e as formações dela, e encerra a sessão neste navegador. */
export async function deleteAccount(): Promise<void> {
  await deleteOwnAccount()
  await signOut()
}

/** Nome do cadastro (`user_metadata.full_name`), ou o e-mail se ele faltar. */
export function displayName(user: User): string {
  const name: unknown = user.user_metadata.full_name
  return typeof name === 'string' && name.trim() ? name.trim() : (user.email ?? 'Minha conta')
}
