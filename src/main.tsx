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

// Antes do router: a volta do Google traz um código na URL, que a sessão consome e remove.
await initAuth()

const router = createRouter({ routeTree })

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
