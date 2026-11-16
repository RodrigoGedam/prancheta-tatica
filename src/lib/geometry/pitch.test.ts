import { describe, it, expect } from 'vitest'
import { computeScale, pxToMeters, mirror, isInsidePitch, penaltyArcHalfAngleDeg } from './pitch'

describe('geometria do campo', () => {
  it('calcula a escala pelo eixo limitante', () => {
    expect(computeScale(740, 1110, 3)).toBe(10)
    expect(computeScale(370, 1110)).toBe(5)
    expect(computeScale(740, 555)).toBe(5)
    expect(computeScale(0, 1110)).toBe(0)
    expect(computeScale(740, -1)).toBe(0)
    expect(computeScale(680, 1050, 0)).toBe(10)
  })
  it('converte pixels em metros considerando a escala e o recuo', () => {
    const pixels = Object.freeze({ x: 30, y: 30 })
    expect(pxToMeters(pixels, 10)).toEqual({ x: 0, y: 0 })
    expect(pxToMeters({ x: 710, y: 1080 }, 10)).toEqual({ x: 68, y: 105 })
    expect(pxToMeters({ x: 5, y: 277.5 }, 5)).toEqual({ x: -2, y: 52.5 })
    expect(pxToMeters({ x: 34, y: 52.5 }, 0.5, 0)).toEqual({ x: 68, y: 105 })
    expect(pxToMeters({ x: 50, y: 50 }, 10, 5)).toEqual({ x: 0, y: 0 })
    expect(pxToMeters(pixels, 10)).not.toBe(pixels)
    expect(pixels).toEqual({ x: 30, y: 30 })
  })
  it('espelha centro, cantos e retorna ao ponto original', () => {
    expect(mirror({ x: 34, y: 52.5 })).toEqual({ x: 34, y: 52.5 })
    for (const p of [{ x: 0, y: 0 }, { x: 68, y: 0 }, { x: 0, y: 105 }, { x: 68, y: 105 }, { x: 12, y: 31 }]) {
      expect(mirror(p)).toEqual({ x: 68 - p.x, y: 105 - p.y })
      expect(mirror(mirror(p))).toEqual(p)
      expect(mirror(p)).not.toBe(p)
    }
  })
  it('inclui linhas e respeita a margem', () => {
    for (const p of [{ x: 0, y: 0 }, { x: 68, y: 105 }, { x: 0, y: 105 }, { x: 68, y: 0 }]) expect(isInsidePitch(p)).toBe(true)
    for (const p of [{ x: -1, y: 50 }, { x: 69, y: 50 }, { x: 30, y: -1 }, { x: 30, y: 106 }]) expect(isInsidePitch(p)).toBe(false)
    expect(isInsidePitch({ x: -3, y: 108 }, 3)).toBe(true)
    expect(isInsidePitch({ x: 71, y: -3 }, 3)).toBe(true)
    expect(isInsidePitch({ x: 71.1, y: 0 }, 3)).toBe(false)
  })
  it('calcula o angulo da meia-lua pela formula oficial', () => {
    expect(penaltyArcHalfAngleDeg()).toBeCloseTo(53.05, 2)
  })
})
