import { z } from 'zod'

const email = z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido.'))

/** Entrar: a regra de tamanho vale só no cadastro, para nunca barrar uma senha já aceita antes. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha.'),
})

export const signUpSchema = z.object({
  email,
  password: z.string().min(8, 'Use pelo menos 8 caracteres.').max(72, 'Use no máximo 72 caracteres.'),
})

export type Credentials = z.output<typeof signInSchema>

const MESSAGES: Readonly<Record<string, string>> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  user_already_exists: 'Este e-mail já tem cadastro. Use Entrar.',
  email_exists: 'Este e-mail já tem cadastro. Use Entrar.',
  weak_password: 'Essa senha é muito fraca. Escolha outra.',
  email_address_invalid: 'Informe um e-mail válido.',
  validation_failed: 'Confira o e-mail e a senha.',
  over_request_rate_limit: 'Muitas tentativas. Espere um pouco e tente de novo.',
  over_email_send_rate_limit: 'Muitas tentativas. Espere um pouco e tente de novo.',
  signup_disabled: 'O cadastro está desativado no momento.',
  email_provider_disabled: 'O cadastro por e-mail está desativado no momento.',
  email_not_confirmed: 'Este e-mail ainda não foi confirmado.',
}

/** Mensagem em português para um erro do Supabase Auth, pelo código dele. */
export function authErrorMessage(code: string | undefined): string {
  return (code && MESSAGES[code]) || 'Não foi possível concluir. Verifique sua conexão e tente de novo.'
}
