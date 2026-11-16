import { createClient } from '@supabase/supabase-js'
import { beforeEach, expect, it, vi } from 'vitest'
import { getSupabase } from './client'
import { createFormation, DataError, fetchFormations, renameFormation } from './queries'

vi.mock('./client', () => ({ getSupabase: vi.fn() }))

const request = vi.fn<typeof fetch>()
const formation = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Customizada',
  slots: Array.from({ length: 11 }, (_, slot) => ({ slot, position: 'MC', x: 34, y: 70 })),
  created_at: '2026-11-05T12:00:00+00:00',
  updated_at: '2026-11-05T12:00:00+00:00',
}

beforeEach(() => {
  request.mockReset()
  vi.mocked(getSupabase).mockReturnValue(createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: request },
  }))
})

it('lista formações com apenas as colunas retornadas pelo contrato, em uma requisição', async () => {
  request.mockResolvedValue(new Response(JSON.stringify([formation])))
  await expect(fetchFormations()).resolves.toEqual([formation])
  expect(request).toHaveBeenCalledTimes(1)
  const url = new URL(String(request.mock.calls[0]![0]))
  expect(url.pathname).toBe('/rest/v1/formations')
  expect(url.searchParams.get('select')?.split(',').sort()).toEqual(Object.keys(formation).sort())
  expect(url.searchParams.get('order')).toBe('name.asc')
})

it('cria e renomeia formações preservando o retorno e os filtros', async () => {
  for (const operation of ['create', 'rename']) {
    request.mockClear()
    request.mockResolvedValue(new Response(JSON.stringify(formation)))
    const result = operation === 'create'
      ? await createFormation(' Customizada ', formation.slots)
      : await renameFormation(formation.id, ' Customizada ')
    expect(result).toEqual(formation)
    expect(request).toHaveBeenCalledTimes(1)
    const [input, init] = request.mock.calls[0]!
    const url = new URL(String(input))
    expect(url.searchParams.get('select')?.split(',').sort()).toEqual(Object.keys(formation).sort())
    expect(init?.method).toBe(operation === 'create' ? 'POST' : 'PATCH')
    expect(JSON.parse(String(init?.body))).toEqual(operation === 'create'
      ? { name: 'Customizada', slots: formation.slots }
      : { name: 'Customizada' })
    expect(url.searchParams.get('id')).toBe(operation === 'create' ? null : `eq.${formation.id}`)
  }
})

it('continua rejeitando respostas com slots inválidos', async () => {
  request.mockResolvedValue(new Response(JSON.stringify([{ ...formation, slots: [] }])))
  await expect(fetchFormations()).rejects.toThrow()
})

it('preserva as mensagens de erro do Supabase', async () => {
  request.mockResolvedValue(new Response(JSON.stringify({ code: '42501', message: 'permission denied' }), { status: 403 }))
  await expect(fetchFormations()).rejects.toThrow(new DataError('Você não tem permissão para isso. Entre na sua conta e tente de novo.'))
})
