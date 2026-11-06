import { describe, expect, it } from 'vitest'
import { authErrorMessage, signInSchema, signUpSchema } from './credentials'

describe('credenciais', () => {
  it('normaliza o e-mail', () => {
    expect(signInSchema.parse({ email: '  Ana@Exemplo.COM ', password: 'x' }).email).toBe('ana@exemplo.com')
  })

  it('recusa e-mail inválido', () => {
    expect(signInSchema.safeParse({ email: 'ana', password: 'x' }).success).toBe(false)
    expect(signUpSchema.safeParse({ email: 'ana@', password: '12345678' }).success).toBe(false)
  })

  it('entrar exige só uma senha preenchida', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '1' }).success).toBe(true)
  })

  it('cadastro aceita de 8 a 72 caracteres, sem alterar a senha', () => {
    expect(signUpSchema.safeParse({ email: 'a@b.com', password: '1234567' }).success).toBe(false)
    expect(signUpSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(73) }).success).toBe(false)
    expect(signUpSchema.parse({ email: 'a@b.com', password: ' 1234567 ' }).password).toBe(' 1234567 ')
  })
})

describe('authErrorMessage', () => {
  it('traduz códigos conhecidos', () => {
    expect(authErrorMessage('invalid_credentials')).toBe('E-mail ou senha incorretos.')
    expect(authErrorMessage('user_already_exists')).toContain('já tem cadastro')
  })

  it('cai numa mensagem genérica', () => {
    const generic = 'Não foi possível concluir. Verifique sua conexão e tente de novo.'
    expect(authErrorMessage(undefined)).toBe(generic)
    expect(authErrorMessage('codigo_novo')).toBe(generic)
  })
})
