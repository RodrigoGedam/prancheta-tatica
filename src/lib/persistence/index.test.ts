import { describe, expect, it } from 'vitest'
import { deserialize, emptySide, emptySnapshot, migrate, serialize } from './index'
import type { DrawShape } from '@/lib/geometry/shapes'

const p = { playerId: 'p', x: 10, y: 20, z: 2 }
const style = { color: '#FFFFFF', width: 'thin', dashed: false } as const
const from = { x: 1, y: 2 }, to = { x: 4, y: 5 }
const shapes: DrawShape[] = [
  { id: 'f', type: 'free', style, points: [from, to] },
  { id: 'a', type: 'arrow', style, from, to },
  { id: 'c', type: 'curve', style, from, to, control: from },
  { id: 'r', type: 'rect', style, x: 1, y: 2, width: 3, height: 4 },
  { id: 'e', type: 'ellipse', style, cx: 1, cy: 2, rx: 3, ry: 4 },
  { id: 't', type: 'text', style, x: 1, y: 2, text: 'Ataque', fontSize: 2 },
]
const read = (data: unknown) => deserialize(JSON.stringify({ version: 1, data }))
describe('persistência', () => {
  it('preserva um snapshot completo e não muta a entrada', () => {
    const s = emptySnapshot()
    s.sides.home = { ...emptySide(), teamId: 'h', initialized: true, colorOverride: '#aAbBcC', placements: [p] }
    s.sides.away = { ...emptySide('4-4-2'), teamId: 'a', initialized: true, placements: [{ ...p, playerId: 'a', z: 3 }] }
    s.hidden.away = true
    s.nextZ = 4
    s.shapes = shapes
    const before = structuredClone(s)
    expect(deserialize(serialize(s))).toEqual(s)
    expect(s).toEqual(before)
  })
  it.each([null, undefined, '', '{', '42', '[]', '{"data":{}}', ...[0, 99, 1.5].map(version => JSON.stringify({ version, data: {} }))])('recupera entrada inválida %s', raw => {
    expect(deserialize(raw)).toEqual(emptySnapshot())
  })
  it('cria objetos independentes', () => {
    const a = emptySnapshot()
    a.sides.home.placements.push(p)
    a.hidden.home = true
    expect(emptySnapshot().sides.home.placements).toEqual([])
    expect(emptySnapshot().hidden.home).toBe(false)
    const raw = serialize(a)
    const first = deserialize(raw), second = deserialize(raw)
    expect(first).not.toBe(second)
    expect(first.sides.home).not.toBe(second.sides.home)
    expect(first.shapes).not.toBe(second.shapes)
  })
  it('recupera campos, placements e desenhos independentemente', () => {
    const best = { ...p, z: 8 }
    const other = { ...p, playerId: 'q', z: 4 }
    const s = read({ sides: { home: { teamId: 'h', formationId: '', colorOverride: 'red', initialized: 'sim', placements: [p, other, best, { ...p, x: null }, { ...p, y: '2' }, { playerId: 'x' }] }, away: [] }, shapes: [shapes[0], { type: 'bad' }, { ...shapes[0], points: [to, from] }, shapes[1]], hidden: { home: true, away: 1 } })
    expect(s.sides.home).toEqual({ ...emptySide(), teamId: 'h', placements: [other, best] })
    expect(s.sides.away).toEqual(emptySide())
    expect(s.shapes).toEqual(shapes.slice(0, 2))
    expect(s.hidden).toEqual({ home: true, away: false })
    expect(s.nextZ).toBe(9)
  })
  it('limpa lado sem time e o visitante duplicado preservando formação', () => {
    expect(read({ sides: { home: { teamId: null, initialized: true, placements: [p] } } }).sides.home).toEqual(emptySide())
    expect(read({ sides: { home: { teamId: 'h' }, away: { teamId: 'h', formationId: 'custom', initialized: true, placements: [p] } } }).sides.away).toEqual(emptySide('custom'))
  })
  it.each([undefined, 0, 2, 3.2])('corrige nextZ %s', nextZ => {
    expect(read({ sides: { home: { teamId: 'h', placements: [{ ...p, z: 3.5 }] } }, nextZ }).nextZ).toBe(4)
  })
  it('migra em ordem e trata falhas', () => {
    const order: number[] = []
    expect(migrate(1, 'x', {}, 1)).toBe('x')
    expect(migrate(1, 'x', { 1: d => { order.push(1); return `${d}a` }, 2: d => { order.push(2); return `${d}b` } }, 3)).toBe('xab')
    expect(order).toEqual([1, 2])
    expect(migrate(1, {}, {}, 3)).toBeNull()
    expect(migrate(1, {}, { 1: () => { throw Error('falha') } }, 2)).toBeNull()
    for (const version of [0, -1, 1.5, 99, NaN, Infinity]) expect(migrate(version, {})).toBeNull()
  })
})

it('descarta texto vazio salvo no meio da digitação', () => {
  const style = { color: '#FFFFFF', width: 'medium', dashed: false } as const
  const raw = JSON.stringify({ version: 1, data: { shapes: [
    { id: 'vazio', type: 'text', style, x: 0, y: 0, text: '  ', fontSize: 2 },
    { id: 'ok', type: 'text', style, x: 0, y: 0, text: 'Pressão', fontSize: 2 },
  ] } })
  expect(deserialize(raw).shapes.map((s) => s.id)).toEqual(['ok'])
})
