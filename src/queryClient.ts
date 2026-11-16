import { QueryClient } from '@tanstack/react-query'

/**
 * Client único do TanStack Query: o login também precisa dele, para recarregar os dados ao trocar de usuário.
 * `staleTime` de 30 s: nesse prazo, um dado em cache é reaproveitado sem nova busca ao Supabase.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})
