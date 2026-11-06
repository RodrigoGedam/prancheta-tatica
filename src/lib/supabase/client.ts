import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

let client: SupabaseClient | null = null

/** Client único, criado sob demanda. Lança com mensagem em pt-BR se o .env.local estiver incompleto. */
export function getSupabase(): SupabaseClient {
  if (client) return client
  const env = envSchema.safeParse(import.meta.env)
  if (!env.success) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local.',
    )
  }
  client = createClient(env.data.VITE_SUPABASE_URL, env.data.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  })
  return client
}
