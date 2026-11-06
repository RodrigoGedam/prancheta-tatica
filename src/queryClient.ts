import { QueryClient } from '@tanstack/react-query'

/** Client único: o login também precisa dele, para recarregar os dados ao trocar de usuário. */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})
