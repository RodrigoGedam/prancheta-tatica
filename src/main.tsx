// Ponto de entrada. A ordem importa: 1) o autosave começa a observar o store; 2) a sessão é conferida
// (com `await` no nível do módulo, a página só renderiza depois); 3) o router é criado e o React renderiza.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { routeTree } from './routeTree.gen'
import { initAuth } from './stores/authStore'
import { startAutosave } from './stores/autosave'
import './styles.css'

// Antes da sessão: se ela limpar a prancheta de outra conta, a limpeza também precisa ficar salva.
startAutosave()

// Antes do router: conferir a sessão antes de carregar os times privados.
await initAuth()

// 'intent': o código de uma rota começa a carregar quando o mouse passa sobre um link para ela.
const router = createRouter({ routeTree, defaultPreload: 'intent' })

// Registra o tipo do router, para que links e parâmetros de rota sejam verificados pelo TypeScript.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root =document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
