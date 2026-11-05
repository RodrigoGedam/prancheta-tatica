import { describe, it, expect, expectTypeOf } from 'vitest'
import { z } from 'zod'
import { ARROW_STROKE_WIDTH_M, STROKE_WIDTH_M, arrowShaft, strokeWidthOf, drawShapeSchema, hitTest, arrowHead, arrowHeadSize, defaultControlPoint, simplifyPath, rectFromDrag, ellipseFromDrag, translateShape, shapeBounds, textBounds, isDegenerate, type DrawShape, type FreeShape, type ArrowShape, type CurveShape, type RectShape, type EllipseShape, type TextShape, type ShapeStyle } from './shapes'
const style: ShapeStyle = { color: '#fff', width: 'thin', dashed: false }
const base = { id: 'a', style }
const from = { x: 0, y: 0 }, to = { x: 20, y: 0 }
const shapes = [
  { ...base, type: 'free', points: [from, to] },
  { ...base, type: 'arrow', from, to },
  { ...base, type: 'curve', from, to, control: { x: 10, y: -10 } },
  { ...base, type: 'rect', x: 0, y: 0, width: 20, height: 10 },
  { ...base, type: 'ellipse', cx: 10, cy: 0, rx: 10, ry: 5 },
  { ...base, type: 'text', x: 0, y: 0, text: 'abcd\nab', fontSize: 2 },
] satisfies [FreeShape, ArrowShape, CurveShape, RectShape, EllipseShape, TextShape]
describe('schema', () => {
  it('mantem o contrato nos dois sentidos', () => {
    expectTypeOf<z.infer<typeof drawShapeSchema>>().toExtend<DrawShape>()
    expectTypeOf<DrawShape>().toExtend<z.infer<typeof drawShapeSchema>>()
    for (const s of shapes) expect(drawShapeSchema.safeParse(s).success).toBe(true)
  })
  it('rejeita dados invalidos', () => {
    for (const s of [{ ...base, type: 'unknown' }, { ...shapes[0], points: [from] }, { ...shapes[3], width: -1 }, { ...shapes[5], fontSize: 0 }, { ...shapes[0], id: '' }]) expect(drawShapeSchema.safeParse(s).success).toBe(false)
  })
})
describe('hitTest', () => {
  const on = [{ x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: -5 }, { x: 10, y: 0 }, { x: 10, y: -5 }, { x: 0, y: 0 }]
  const near = [{ x: 10, y: .3 }, { x: 10, y: .3 }, { x: 10, y: -5.3 }, { x: 10, y: -.3 }, { x: 10, y: -5.3 }, { x: -.2, y: 0 }]
  shapes.forEach((s, i) => it(s.type, () => {
    expect(hitTest(s, on[i]!, 0)).toBe(true)
    expect(hitTest(s, near[i]!, .3)).toBe(true)
    expect(hitTest(s, { x: 100, y: 100 }, .3)).toBe(false)
  }))
  it('inclui preenchimento, pontas e espessura', () => {
    expect(hitTest(shapes[3], { x: 10, y: 5 }, 0)).toBe(true)
    expect(hitTest(shapes[4], { x: 10, y: 0 }, 0)).toBe(true)
    expect(hitTest(shapes[1], { x: 19, y: -.4 }, 0)).toBe(true)
    const head = arrowHead(shapes[2].control, to, arrowHeadSize(style))
    const center = { x: (head[0].x + head[1].x + head[2].x) / 3, y: (head[0].y + head[1].y + head[2].y) / 3 }
    expect(hitTest(shapes[2], center, 0)).toBe(true)
    expect(hitTest(shapes[0], { x: 10, y: .2 }, 0)).toBe(false)
    expect(hitTest({ ...shapes[0], style: { ...style, width: 'thick' } }, { x: 10, y: .2 }, 0)).toBe(true)
    expect(hitTest({ ...shapes[0], points: [from] }, from, 0)).toBe(true)
    for (const [rx, ry] of [[0, 5], [5, 0], [0, 0]] as const) {
      const s = { ...shapes[4], rx, ry }
      expect(hitTest(s, { x: 10, y: 0 }, 0)).toBe(true)
      expect(hitTest(s, { x: 10, y: 10 }, 0)).toBe(false)
    }
    expect(hitTest(shapes[3], { x: -.3, y: -.3 }, .2)).toBe(false)
  })
})
it('ponta e controle seguem y para baixo', () => {
  expect(arrowHead(from, { x: 10, y: 0 }, 2)).toEqual([{ x: 8, y: -1 }, { x: 10, y: 0 }, { x: 8, y: 1 }])
  expect(arrowHead(from, from, 2)).toEqual([{ x: -1, y: 2 }, from, { x: 1, y: 2 }])
  expect(defaultControlPoint(from, to)).toEqual({ x: 10, y: -5 })
  expect(defaultControlPoint(from, from)).toEqual(from)
})
it('simplifica sem mutar', () => {
  const line = Array.from({ length: 50 }, (_, x) => ({ x, y: 0 }))
  const copy = structuredClone(line)
  expect(simplifyPath(line, .1)).toEqual([line[0], line[49]])
  expect(line).toEqual(copy)
  const corner = [from, { x: 0, y: 10 }, { x: 10, y: 10 }]
  expect(simplifyPath(corner, 1)).toEqual(corner)
  for (const points of [[], [from], [from, to]]) {
    expect(simplifyPath(points, 1)).toEqual(points)
    expect(simplifyPath(points, 1)).not.toBe(points)
  }
})
it('normaliza todas as direcoes de arrasto', () => {
  for (const [a, b] of [[from, { x: 20, y: 10 }], [{ x: 20, y: 10 }, from], [{ x: 0, y: 10 }, to], [to, { x: 0, y: 10 }]] as const) {
    expect(rectFromDrag(a, b)).toEqual({ x: 0, y: 0, width: 20, height: 10 })
    expect(ellipseFromDrag(a, b)).toEqual({ cx: 10, cy: 5, rx: 10, ry: 5 })
  }
})
it('desloca cada coordenada sem alterar a entrada', () => {
  const expected = [
    { ...shapes[0], points: [{ x: 3, y: -2 }, { x: 23, y: -2 }] },
    { ...shapes[1], from: { x: 3, y: -2 }, to: { x: 23, y: -2 } },
    { ...shapes[2], from: { x: 3, y: -2 }, to: { x: 23, y: -2 }, control: { x: 13, y: -12 } },
    { ...shapes[3], x: 3, y: -2 }, { ...shapes[4], cx: 13, cy: -2 }, { ...shapes[5], x: 3, y: -2 },
  ]
  shapes.forEach((s, i) => { const copy = structuredClone(s); expect(translateShape(s, 3, -2)).toEqual(expected[i]); expect(s).toEqual(copy) })
})
it('calcula caixas e o extremo real da curva', () => {
  expect(shapeBounds(shapes[2])).toEqual({ x: 0, y: -5, width: 20, height: 5 })
  const head = arrowHeadSize(style), arrowBox = shapeBounds(shapes[1])
  expect(arrowBox.x).toBe(0)
  expect(arrowBox.width).toBe(20)
  expect(arrowBox.y).toBeCloseTo(-head / 2)
  expect(arrowBox.height).toBeCloseTo(head)
  expect(shapeBounds(shapes[0])).toEqual({ x: 0, y: 0, width: 20, height: 0 })
  expect(shapeBounds(shapes[3])).toEqual({ x: 0, y: 0, width: 20, height: 10 })
  expect(shapeBounds(shapes[4])).toEqual({ x: 0, y: -5, width: 20, height: 10 })
  expect(textBounds(shapes[5])).toEqual({ x: 0, y: 0, width: 4.4, height: 4.8 })
  expect(shapeBounds(shapes[5])).toEqual(textBounds(shapes[5]))
  expect(textBounds({ ...shapes[5], text: '' }).width).toBe(0)
})
it('respeita os limites de degeneracao', () => {
  const valid = [{ ...shapes[0], points: [from, { x: .5, y: 0 }] }, { ...shapes[1], to: { x: 1, y: 0 } }, { ...shapes[2], to: { x: 1, y: 0 } }, { ...shapes[3], width: .5, height: .5 }, { ...shapes[4], rx: .25, ry: .25 }, shapes[5]]
  const invalid = [{ ...shapes[0], points: [from, { x: .49, y: 0 }] }, { ...shapes[1], to: { x: .99, y: 0 } }, { ...shapes[2], to: { x: .99, y: 0 } }, { ...shapes[3], height: .49 }, { ...shapes[4], ry: .24 }, { ...shapes[5], text: ' \n ' }]
  valid.forEach(s => expect(isDegenerate(s)).toBe(false))
  invalid.forEach(s => expect(isDegenerate(s)).toBe(true))
})

describe('flechas grossas', () => {
  const style: ShapeStyle = { color: '#FFFFFF', width: 'thin', dashed: false }
  it('a espessura fina das flechas equivale à grossa geral', () => {
    expect(ARROW_STROKE_WIDTH_M.thin).toBe(STROKE_WIDTH_M.thick)
    expect(strokeWidthOf({ type: 'arrow', style })).toBe(ARROW_STROKE_WIDTH_M.thin)
    expect(strokeWidthOf({ type: 'free', style })).toBe(STROKE_WIDTH_M.thin)
  })
  it('o corpo da flecha reta termina no meio da ponta', () => {
    const shape: ArrowShape = { id: 'a', type: 'arrow', style, from: { x: 0, y: 0 }, to: { x: 20, y: 0 } }
    const shaft = arrowShaft(shape)
    expect(shaft.from).toEqual({ x: 0, y: 0 })
    expect(shaft.to.x).toBeCloseTo(20 - arrowHeadSize(style) / 2)
    expect(shaft.to.y).toBe(0)
  })
  it('flecha mais curta que a ponta não inverte o corpo', () => {
    const shape: ArrowShape = { id: 'a', type: 'arrow', style, from: { x: 0, y: 0 }, to: { x: 1, y: 0 } }
    expect(arrowShaft(shape).to).toEqual({ x: 0, y: 0 })
  })
  it('o corpo da curva é o trecho inicial da mesma quadrática', () => {
    const shape: CurveShape = { id: 'c', type: 'curve', style, from: { x: 0, y: 0 }, to: { x: 20, y: 0 }, control: { x: 10, y: -10 } }
    const shaft = arrowShaft(shape)
    expect(shaft.from).toEqual(shape.from)
    const gap = Math.hypot(shaft.to.x - shape.to.x, shaft.to.y - shape.to.y)
    expect(gap).toBeGreaterThan(arrowHeadSize(style) * 0.4)
    expect(gap).toBeLessThan(arrowHeadSize(style) * 0.6)
    // O ponto final do trecho está sobre a curva original.
    expect(hitTest({ ...shape, style: { ...style } }, shaft.to, 0.05)).toBe(true)
    expect(shaft.control!.x).toBeLessThan(shape.control.x)
  })
  it('o corpo da curva encosta na ponta mesmo com o controle longe', () => {
    const shape: CurveShape = { id: 'c', type: 'curve', style, from: { x: 34, y: 80 }, to: { x: 68, y: 100 }, control: { x: 0, y: 0 } }
    const shaft = arrowShaft(shape)
    const gap = Math.hypot(shaft.to.x - shape.to.x, shaft.to.y - shape.to.y)
    expect(gap).toBeCloseTo(arrowHeadSize(style) * 0.5, 1)
  })
})
