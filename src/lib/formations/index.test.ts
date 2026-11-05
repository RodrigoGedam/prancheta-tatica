import { describe, expect, it } from 'vitest'
import { FIXED_FORMATIONS, getFixedFormation, mirrorFormation, slotPoint, assignPlayersToSlots, validateCustomFormation, buildCustomSlots } from './index'
import type { FormationSlot } from '@/lib/supabase/schemas'

const slot = (position: string, index = 0): FormationSlot => ({ slot: index, position, x: 34, y: 100 })
const players = (...positions: string[]) => positions.map((position, i) => ({ id: String(i), position }))
const swapped: Record<string, string> = { LD: 'LE', LE: 'LD', ALD: 'ALE', ALE: 'ALD', MD: 'ME', ME: 'MD', PD: 'PE', PE: 'PD' }

describe('formações fixas', () => {
  it('oferece as cinco formações na ordem exigida', () => {
    expect(FIXED_FORMATIONS.map(f => f.id)).toEqual(['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2'])
    expect(getFixedFormation('inexistente')).toBeUndefined()
    expect(FIXED_FORMATIONS.map(f => f.slots.map(s => s.position).join(','))).toEqual([
      'GOL,LD,ZAG,ZAG,LE,MD,MC,MC,ME,ATA,ATA',
      'GOL,LD,ZAG,ZAG,LE,MC,VOL,MC,PD,ATA,PE',
      'GOL,LD,ZAG,ZAG,LE,VOL,VOL,PD,MEI,PE,ATA',
      'GOL,ZAG,ZAG,ZAG,ALD,VOL,MC,MEI,ALE,ATA,ATA',
      'GOL,ALD,ZAG,ZAG,ZAG,ALE,MC,VOL,MC,ATA,ATA',
    ])
  })
  for (const id of ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2']) {
    it(`${id}: valida slots, simetria e distância`, () => {
      const f = getFixedFormation(id)!
      expect(f.name).toBe(id)
      expect(f.slots.map(s => s.slot)).toEqual(Array.from({ length: 11 }, (_, i) => i))
      expect(f.slots[0]).toEqual({ slot: 0, position: 'GOL', x: 34, y: 100 })
      expect(f.slots.filter(s => s.position === 'GOL')).toHaveLength(1)
      expect(validateCustomFormation(f.slots)).toEqual({ ok: true, slots: f.slots })
      for (const s of f.slots) {
        expect(s.y).toBeGreaterThanOrEqual(55)
        expect(s.y).toBeLessThanOrEqual(101)
        expect(s.x * 10).toBeCloseTo(Math.round(s.x * 10))
        expect(s.y * 10).toBeCloseTo(Math.round(s.y * 10))
        expect(f.slots.some(t => t.x === 68 - s.x && t.y === s.y && t.position === (swapped[s.position] ?? s.position))).toBe(true)
        for (const t of f.slots.filter(t => t !== s)) expect(Math.hypot(s.x - t.x, s.y - t.y)).toBeGreaterThanOrEqual(6)
      }
    })
  }
  it('espelha sem mutar e obtém pontos por lado', () => {
    const f = { id: 'teste', name: 'Teste', slots: [slot('LD')] }
    const before = structuredClone(f)
    expect(mirrorFormation(mirrorFormation(f))).toEqual(f)
    expect(f).toEqual(before)
    expect(mirrorFormation(f).slots[0]).not.toBe(f.slots[0])
    expect(slotPoint(f.slots[0]!, 'home')).toEqual({ x: 34, y: 100 })
    expect(slotPoint(f.slots[0]!, 'away')).toEqual({ x: 34, y: 5 })
  })
})

describe('distribuição', () => {
  it('prioriza correspondências exatas e mantém os objetos', () => {
    const slots = getFixedFormation('4-3-3')!.slots
    const roster = players(...slots.map(s => s.position)).reverse()
    const result = assignPlayersToSlots(roster, slots)
    expect(result.assigned).toHaveLength(11)
    for (const a of result.assigned) expect(a.player.position).toBe(a.slot.position)
    expect(new Set(result.assigned.map(a => a.player))).toHaveProperty('size', 11)
    expect(assignPlayersToSlots(roster, slots)).toEqual(result)
  })
  it('usa MD/ME como pontas', () => {
    expect(assignPlayersToSlots(players('ME', 'MD'), [slot('PD'), slot('PE', 1)]).assigned.map(a => a.player.position)).toEqual(['MD', 'ME'])
  })
  it('tenta a primeira compatibilidade de todos antes da segunda', () => {
    const result = assignPlayersToSlots(players('MD', 'LAT'), [slot('ALD'), slot('PD', 1)])
    expect(result.assigned.map(a => a.player.position)).toEqual(['LAT', 'MD'])
  })
  it('preserva a prioridade exata antes de compatíveis', () => {
    expect(assignPlayersToSlots(players('MC', 'LAT'), [slot('VOL'), slot('MC', 1)]).assigned.map(a => a.player.position)).toEqual(['LAT', 'MC'])
  })
  it('deixa dois dos treze jogadores livres na ordem original', () => {
    const slots = getFixedFormation('4-3-3')!.slots
    const roster = players(...slots.map(s => s.position), 'LAT', 'LAT')
    expect(assignPlayersToSlots(roster, slots).unassigned).toEqual(roster.slice(11))
  })
  it('só usa o segundo goleiro na linha depois dos demais', () => {
    const result = assignPlayersToSlots(players('GOL', 'GOL', 'LAT'), [slot('GOL'), slot('LD', 1), slot('LE', 2)])
    expect(result.assigned.map(a => a.player.id)).toEqual(['0', '2', '1'])
    expect(assignPlayersToSlots(players('GOL', 'GOL', 'LAT'), [slot('GOL'), slot('LD', 1)]).unassigned.map(p => p.id)).toEqual(['1'])
  })
  it('preenche o slot GOL por último sem goleiros', () => {
    const result = assignPlayersToSlots(players('LAT', 'OUTRA', 'X'), [slot('GOL'), slot('LD', 1), slot('LE', 2)])
    expect(result.assigned.map(a => a.player.id)).toEqual(['2', '0', '1'])
  })
  it('deixa slots vazios com elenco insuficiente e não casa desconhecidas no passo exato', () => {
    expect(assignPlayersToSlots(players('LAT'), [slot('LD'), slot('LAT', 1)]).assigned.map(a => a.slot.slot)).toEqual([0])
    expect(assignPlayersToSlots([], [slot('GOL')])).toEqual({ assigned: [], unassigned: [] })
  })
})

describe('validação', () => {
  const valid = () => Array.from({ length: 11 }, (_, i) => slot(i === 0 ? 'GOL' : 'MC', i))
  it('ordena sem mutar', () => {
    const input = valid().reverse()
    expect(validateCustomFormation(input)).toEqual({ ok: true, slots: valid() })
    expect(input[0]!.slot).toBe(10)
  })
  it.each([null, {}, 'texto'])('rejeita entrada que não é array: %s', input => {
    expect(validateCustomFormation(input)).toEqual({ ok: false, errors: ['Formato de formação inválido.'] })
  })
  it('acumula todos os erros sem repetir mensagens', () => {
    const input = valid().slice(1)
    input[0] = { slot: 11, position: 'LAT', x: -1, y: 20 }
    input[1] = { slot: 11, position: 'LAT', x: 10, y: 106 }
    expect(validateCustomFormation(input)).toEqual({ ok: false, errors: [
      'A formação precisa ter exatamente 11 jogadores (tem 10).',
      'A formação precisa ter exatamente um goleiro.',
      'Slots repetidos ou inválidos.',
      'Posição "LAT" inválida.',
      'Há jogadores fora do campo.',
    ] })
  })
  it('detecta formato inválido e demais problemas nas entradas legíveis', () => {
    const result = validateCustomFormation([null, { ...slot('X'), x: 'texto' }, slot('Y', -1)])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors).toEqual(expect.arrayContaining(['Formato de formação inválido.', 'Slots repetidos ou inválidos.', 'Posição "X" inválida.', 'Posição "Y" inválida.']))
  })
  it('detecta duplicatas e mais de um goleiro', () => {
    const input = valid()
    input[1] = slot('GOL')
    expect(validateCustomFormation(input)).toEqual({ ok: false, errors: ['A formação precisa ter exatamente um goleiro.', 'Slots repetidos ou inválidos.'] })
  })
  it('aceita as bordas do campo', () => {
    const input = valid()
    input[0] = { ...input[0]!, x: 0, y: 0 }
    input[1] = { ...input[1]!, x: 68, y: 105 }
    expect(validateCustomFormation(input).ok).toBe(true)
  })
})

describe('criação de slots', () => {
  it('normaliza away, arredonda, ordena e numera sem mutar', () => {
    const entries = [
      { position: 'ata', point: { x: 34, y: 47 } },
      { position: 'le', point: { x: 60.04, y: 16.76 } },
      { position: 'gol', point: { x: 34, y: 5 } },
      { position: 'ld', point: { x: 7.96, y: 17 } },
    ]
    const before = structuredClone(entries)
    expect(buildCustomSlots(entries, 'away')).toEqual([
      { slot: 0, position: 'GOL', x: 34, y: 100 },
      { slot: 1, position: 'LD', x: 60, y: 88 },
      { slot: 2, position: 'LE', x: 8, y: 88.2 },
      { slot: 3, position: 'ATA', x: 34, y: 58 },
    ])
    expect(entries).toEqual(before)
    expect(buildCustomSlots([{ position: 'lat', point: { x: -1.26, y: 120.24 } }], 'home')).toEqual([{ slot: 0, position: 'LAT', x: -1.3, y: 120.2 }])
  })
})
