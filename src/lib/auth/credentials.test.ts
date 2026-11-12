import { describe, expect, it } from 'vitest'
import { authErrorMessage, signInSchema, signUpSchema } from './credentials'

describe('credenciais', () => {
  it('normaliza o e-mail', () => {
    expect(signInSchema.parse({ email: '  Ana@Exemplo.COM ', password: 'x' }).email).toBe('ana@exemplo.com')
  })

  it('recusa e-mail inválido', () => {
    expect(signInSchema.safeParse({ email: 'ana', password: 'x' }).success).toBe(false)
    expect(signUpSchema.safeParse({ name: 'Ana', email: 'ana@', password: '12345678' }).success).toBe(false)
  })

  it('entrar exige só uma senha preenchida', () => {
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
    expect(signInSchema.safeParse({ email: 'a@b.com', password: '1' }).success).toBe(true)
  })

  it('cadastro aceita de 8 a 72 caracteres, sem alterar a senha', () => {
    expect(signUpSchema.safeParse({ name: 'Ana', email: 'a@b.com', password: '1234567' }).success).toBe(false)
    expect(signUpSchema.safeParse({ name: 'Ana', email: 'a@b.com', password: 'x'.repeat(73) }).success).toBe(false)
    expect(signUpSchema.parse({ name: 'Ana', email: 'a@b.com', password: ' 1234567 ' }).password).toBe(' 1234567 ')
    expect(signUpSchema.safeParse({ name: 'Ana', email: 'a@b.com', password: 'x'.repeat(72) }).success).toBe(true)
  })

  it('cadastro normaliza nome e e-mail, preservando acentos', () => {
    expect(signUpSchema.parse({ name: '  João da Silva  ', email: '  Ana@Exemplo.COM ', password: '12345678' })).toEqual({
      name: 'João da Silva', email: 'ana@exemplo.com', password: '12345678',
    })
  })

  it('cadastro exige um nome com até 80 caracteres após trim', () => {
    const credentials = { email: 'ana@exemplo.com', password: '12345678' }
    for (const name of [undefined, null, 42, '', '   ', 'a'.repeat(81)]) {
      expect(signUpSchema.safeParse({ ...credentials, name }).success).toBe(false)
    }
    expect(signUpSchema.safeParse({ ...credentials, name: ` ${'a'.repeat(80)} ` }).success).toBe(true)
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
