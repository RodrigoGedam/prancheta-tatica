// Objetos de desenho da prancheta, em METROS (mesmo sistema do campo; ver ./pitch.ts).
import { z } from 'zod'
import type { Point } from './pitch'

export const DRAW_COLORS = [
  { label: 'Branco', hex: '#FFFFFF' },
  { label: 'Amarelo', hex: '#FACC15' },
  { label: 'Vermelho', hex: '#EF4444' },
  { label: 'Azul-claro', hex: '#38BDF8' },
  { label: 'Rosa', hex: '#F472B6' },
  { label: 'Preto', hex: '#111827' },
] as const

export type StrokeWidth = 'thin' | 'medium' | 'thick'

/** Espessura do traço em metros. */
export const STROKE_WIDTH_M: Record<StrokeWidth, number> = { thin: 0.25, medium: 0.4, thick: 0.6 }

/** Espessura (m) das flechas, mais grossas que os outros traços: a fina já equivale à grossa geral. */
export const ARROW_STROKE_WIDTH_M: Record<StrokeWidth, number> = { thin: 0.6, medium: 0.9, thick: 1.2 }

/** Espessura (m) do traço de um desenho, considerando o tipo. */
export function strokeWidthOf(shape: Pick<DrawShape, 'type' | 'style'>): number {
  return shape.type === 'arrow' || shape.type === 'curve' ? ARROW_STROKE_WIDTH_M[shape.style.width] : STROKE_WIDTH_M[shape.style.width]
}

/** Opacidade do preenchimento de retângulo e círculo. */
export const FILL_OPACITY = 0.2

export const pointSchema = z.object({ x: z.number(), y: z.number() })

export const shapeStyleSchema = z.object({
  // Mesmo formato que `parseHex` aceita: outra coisa lançaria erro ao desenhar e derrubaria a prancheta.
  color: z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i),
  width: z.enum(['thin', 'medium', 'thick']),
  dashed: z.boolean(),
})

const base = { id: z.string().min(1), style: shapeStyleSchema }
export const drawShapeSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('free'), points: z.array(pointSchema).min(2) }),
  z.object({ ...base, type: z.literal('arrow'), from: pointSchema, to: pointSchema }),
  z.object({ ...base, type: z.literal('curve'), from: pointSchema, to: pointSchema, control: pointSchema }),
  z.object({ ...base, type: z.literal('rect'), x: z.number(), y: z.number(), width: z.number().nonnegative(), height: z.number().nonnegative() }),
  z.object({ ...base, type: z.literal('ellipse'), cx: z.number(), cy: z.number(), rx: z.number().nonnegative(), ry: z.number().nonnegative() }),
  z.object({ ...base, type: z.literal('text'), x: z.number(), y: z.number(), text: z.string(), fontSize: z.number().positive() }),
])

export type ShapeStyle = z.infer<typeof shapeStyleSchema>
export type FreeShape = { id: string; type: 'free'; style: ShapeStyle; points: Point[] }
export type ArrowShape = { id: string; type: 'arrow'; style: ShapeStyle; from: Point; to: Point }
export type CurveShape = { id: string; type: 'curve'; style: ShapeStyle; from: Point; to: Point; control: Point }
export type RectShape = { id: string; type: 'rect'; style: ShapeStyle; x: number; y: number; width: number; height: number }
export type EllipseShape = { id: string; type: 'ellipse'; style: ShapeStyle; cx: number; cy: number; rx: number; ry: number }
export type TextShape = { id: string; type: 'text'; style: ShapeStyle; x: number; y: number; text: string; fontSize: number }
export type DrawShape = FreeShape | ArrowShape | CurveShape | RectShape | EllipseShape | TextShape

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}


function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y) }
function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, squared = dx * dx + dy * dy
  // Projeta no segmento e limita às pontas; segmento de comprimento zero vira um ponto.
  const t = squared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / squared))
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy })
}
function polylineHit(points: readonly Point[], p: Point, tol: number): boolean {
  if (points.length === 1) return distance(points[0]!, p) <= tol
  return points.some((b, i) => i > 0 && segmentDistance(p, points[i - 1]!, b) <= tol)
}
function insideBounds(b: Bounds, p: Point, tol = 0): boolean {
  return p.x >= b.x - tol && p.x <= b.x + b.width + tol && p.y >= b.y - tol && p.y <= b.y + b.height + tol
}
function triangleHit(p: Point, [a, b, c]: [Point, Point, Point]): boolean {
  const cross = (u: Point, v: Point) => (v.x - u.x) * (p.y - u.y) - (v.y - u.y) * (p.x - u.x)
  // O ponto está no triângulo se ficar do mesmo lado das três bordas.
  const values = [cross(a, b), cross(b, c), cross(c, a)]
  return values.every(v => v >= 0) || values.every(v => v <= 0)
}
function curvePoint(s: CurveShape, t: number): Point {
  const u = 1 - t
  return { x: u * u * s.from.x + 2 * u * t * s.control.x + t * t * s.to.x,
    y: u * u * s.from.y + 2 * u * t * s.control.y + t * t * s.to.y }
}
/** Comprimento (m) da ponta da flecha. */
export function arrowHeadSize(style: ShapeStyle): number { return 2.2 * ARROW_STROKE_WIDTH_M[style.width] + 1.2 }

/**
 * Corpo da flecha encurtado até o meio da ponta, para o traço grosso não vazar pela ponta fina.
 * Na curva, devolve o trecho inicial da quadrática (de Casteljau) que termina a `trim` metros do fim.
 */
export function arrowShaft(shape: ArrowShape | CurveShape): { from: Point; control?: Point; to: Point } {
  const trim = arrowHeadSize(shape.style) * 0.5
  if (shape.type === 'arrow') {
    const length = distance(shape.from, shape.to)
    const k = length === 0 ? 0 : Math.max(0, length - trim) / length
    return { from: { ...shape.from }, to: { x: shape.from.x + (shape.to.x - shape.from.x) * k, y: shape.from.y + (shape.to.y - shape.from.y) * k } }
  }
  // Anda do fim da curva para trás até acumular `trim` de comprimento.
  const steps = 64
  let walked = 0
  let t = 0
  for (let i = steps; i > 0; i--) {
    const segment = distance(curvePoint(shape, i / steps), curvePoint(shape, (i - 1) / steps))
    if (walked + segment >= trim) {
      // Interpola dentro do segmento: um passo pode ser maior que a ponta inteira.
      t = (i - (segment === 0 ? 0 : (trim - walked) / segment)) / steps
      break
    }
    walked += segment
  }
  const lerp = (a: Point, b: Point): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
  return { from: { ...shape.from }, control: lerp(shape.from, shape.control), to: curvePoint(shape, t) }
}
/** Testa se o clique atinge o desenho; ponto e tolerância em metros, incluindo metade da espessura. */
export function hitTest(shape: DrawShape, point: Point, tolerance: number): boolean {
  const tol = tolerance + strokeWidthOf(shape) / 2
  switch (shape.type) {
    case 'free': return polylineHit(shape.points, point, tol)
    case 'arrow': return segmentDistance(point, shape.from, shape.to) <= tol || triangleHit(point, arrowHead(shape.from, shape.to, arrowHeadSize(shape.style)))
    case 'curve': return polylineHit(Array.from({ length: 65 }, (_, i) => curvePoint(shape, i / 64)), point, tol) || triangleHit(point, arrowHead(shape.control, shape.to, arrowHeadSize(shape.style)))
    case 'rect': {
      const nearest = { x: Math.max(shape.x, Math.min(shape.x + shape.width, point.x)), y: Math.max(shape.y, Math.min(shape.y + shape.height, point.y)) }
      return distance(point, nearest) <= tol
    }
    case 'ellipse': {
      const { cx, cy, rx, ry } = shape
      if (rx === 0 || ry === 0) return segmentDistance(point, { x: cx - rx, y: cy - ry }, { x: cx + rx, y: cy + ry }) <= tol
      const x = Math.abs(point.x - cx), y = Math.abs(point.y - cy)
      if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) return true
      // Busca por metades o ponto mais próximo na borda da elipse, para medir a tolerância em metros.
      let low = 0, high = Math.hypot(rx * x, ry * y)
      for (let i = 0; i < 64; i++) {
        const mid = (low + high) / 2
        if ((rx * x / (mid + rx * rx)) ** 2 + (ry * y / (mid + ry * ry)) ** 2 > 1) low = mid
        else high = mid
      }
      return Math.hypot(x - rx * rx * x / (high + rx * rx), y - ry * ry * y / (high + ry * ry)) <= tol
    }
    case 'text': return insideBounds(textBounds(shape), point, tolerance)
  }
}
/** Ponta de flecha: [esquerda, ponta, direita]. */
export function arrowHead(from: Point, to: Point, size: number): [Point, Point, Point] {
  const length = distance(from, to)
  const dx = length === 0 ? 0 : (to.x - from.x) / length
  const dy = length === 0 ? -1 : (to.y - from.y) / length
  const x = to.x - dx * size, y = to.y - dy * size
  return [{ x: x + dy * size / 2, y: y - dx * size / 2 }, { ...to }, { x: x - dy * size / 2, y: y + dx * size / 2 }]
}
/** Cria a curvatura inicial deslocando o meio perpendicularmente ao segmento, em metros. */
export function defaultControlPoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2 + (b.y - a.y) / 4, y: (a.y + b.y) / 2 - (b.x - a.x) / 4 }
}
/** Simplifica o traço por RDP (remove pontos quase alinhados), com tolerância `epsilon` em metros. */
export function simplifyPath(points: readonly Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points]
  const keep = new Set([0, points.length - 1])
  // Divide no ponto mais distante e repete nos dois trechos; a pilha evita recursão em traços longos.
  const pending: [number, number][] = [[0, points.length - 1]]
  while (pending.length) {
    const [start, end] = pending.pop()!
    let farthest = -1, maximum = Math.max(0, epsilon)
    for (let i = start + 1; i < end; i++) {
      const d = segmentDistance(points[i]!, points[start]!, points[end]!)
      if (d > maximum) { maximum = d; farthest = i }
    }
    if (farthest !== -1) { keep.add(farthest); pending.push([start, farthest], [farthest, end]) }
  }
  return points.filter((_, i) => keep.has(i))
}
/** Limites em metros, válidos mesmo quando o arrasto vai da direita para a esquerda ou de baixo para cima. */
export function rectFromDrag(a: Point, b: Point): Bounds {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }
}
/** Usa o retângulo do arrasto para obter centro e semieixos da elipse, em metros. */
export function ellipseFromDrag(a: Point, b: Point): { cx: number; cy: number; rx: number; ry: number } {
  return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, rx: Math.abs(a.x - b.x) / 2, ry: Math.abs(a.y - b.y) / 2 }
}
/** Desloca todos os pontos por `dx` e `dy` metros sem alterar o desenho original. */
export function translateShape<S extends DrawShape>(shape: S, dx: number, dy: number): S {
  const move = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy })
  switch (shape.type) {
    case 'free': return { ...shape, points: shape.points.map(move) }
    case 'arrow': return { ...shape, from: move(shape.from), to: move(shape.to) }
    case 'curve': return { ...shape, from: move(shape.from), to: move(shape.to), control: move(shape.control) }
    case 'rect': case 'text': return { ...shape, x: shape.x + dx, y: shape.y + dy }
    case 'ellipse': return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy }
  }
}
function pointsBounds(points: Point[]): Bounds {
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 }
  let x = Infinity, y = Infinity, right = -Infinity, bottom = -Infinity
  for (const p of points) { x = Math.min(x, p.x); y = Math.min(y, p.y); right = Math.max(right, p.x); bottom = Math.max(bottom, p.y) }
  return { x, y, width: right - x, height: bottom - y }
}
/** Retângulo envolvente em metros, incluindo pontas de flecha e sem acrescentar espessura do traço. */
export function shapeBounds(shape: DrawShape): Bounds {
  switch (shape.type) {
    case 'free': return pointsBounds(shape.points)
    case 'arrow': return pointsBounds([shape.from, ...arrowHead(shape.from, shape.to, arrowHeadSize(shape.style))])
    case 'curve': {
      const points = [shape.from, ...arrowHead(shape.control, shape.to, arrowHeadSize(shape.style))]
      // Os extremos da curva podem ficar entre as pontas: procura onde a derivada de cada eixo zera.
      for (const axis of ['x', 'y'] as const) {
        const denominator = shape.from[axis] - 2 * shape.control[axis] + shape.to[axis]
        const t = (shape.from[axis] - shape.control[axis]) / denominator
        if (t > 0 && t < 1) points.push(curvePoint(shape, t))
      }
      return pointsBounds(points)
    }
    case 'rect': return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
    case 'ellipse': return { x: shape.cx - shape.rx, y: shape.cy - shape.ry, width: 2 * shape.rx, height: 2 * shape.ry }
    case 'text': return textBounds(shape)
  }
}
/** Estima a caixa do texto em metros: largura média de 0,55 × fonte e entrelinha de 1,2 × fonte. */
export function textBounds(shape: TextShape): Bounds {
  const lines = shape.text.split('\n')
  return { x: shape.x, y: shape.y, width: Math.max(...lines.map(line => line.length)) * shape.fontSize * 0.55, height: lines.length * shape.fontSize * 1.2 }
}
/** Descarta gestos pequenos demais: 0,5 m no traço/caixa, 1 m entre pontas de flecha, ou texto vazio. */
export function isDegenerate(shape: DrawShape): boolean {
  switch (shape.type) {
    case 'free': return shape.points.reduce((sum, p, i) => sum + (i ? distance(shape.points[i - 1]!, p) : 0), 0) < 0.5
    case 'arrow': case 'curve': return distance(shape.from, shape.to) < 1
    case 'rect': return shape.width < 0.5 || shape.height < 0.5
    case 'ellipse': return shape.rx < 0.25 || shape.ry < 0.25
    case 'text': return shape.text.trim() === ''
  }
}
