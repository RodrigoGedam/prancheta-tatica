import { BOARD_STORAGE_KEY, serialize } from '@/lib/persistence'
import { snapshotOf, useBoardStore } from './boardStore'

/** `localStorage`, ou null quando o navegador bloqueia o acesso (ler a propriedade já pode lançar). */
function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Espera (ms) depois da última mudança para gravar. */
export const AUTOSAVE_DELAY = 400

/**
 * Grava a prancheta no localStorage com debounce, e na hora ao sair da página.
 * Chamar uma vez, no início do app. Devolve a função que para o autosave (gravando o pendente).
 */
export function startAutosave(storage: Storage | null = browserStorage(), delay = AUTOSAVE_DELAY): () => void {
  // Storage bloqueado (cookies desligados, iframe isolado): a prancheta funciona, só não salva.
  if (!storage) return () => {}
  let timer: ReturnType<typeof setTimeout> | undefined

  const save = () => {
    timer = undefined
    try {
      storage.setItem(BOARD_STORAGE_KEY, serialize(snapshotOf(useBoardStore.getState())))
    } catch {
      // Cota cheia ou storage bloqueado: a prancheta continua funcionando, só não fica salva.
    }
  }

  const unsubscribe = useBoardStore.subscribe((s, prev) => {
    if (s.sides === prev.sides && s.hidden === prev.hidden && s.nextZ === prev.nextZ && s.shapes === prev.shapes) return
    clearTimeout(timer)
    timer = setTimeout(save, delay)
  })

  const flush = () => {
    if (timer === undefined) return
    clearTimeout(timer)
    save()
  }
  const win = typeof window === 'undefined' ? undefined : window
  win?.addEventListener('pagehide', flush)

  return () => {
    flush()
    unsubscribe()
    win?.removeEventListener('pagehide', flush)
  }
}
