import { describe, it, expect } from 'vitest'
import { computeScale, metersToPx, pxToMeters, mirror, toSide, isInsidePitch, clampToPitch, penaltyArcHalfAngleDeg } from './pitch'

describe('geometria do campo', () => {
  it('calcula a escala pelo eixo limitante', () => {
    expect(computeScale(740, 1110, 3)).toBe(10)
    expect(computeScale(370, 1110)).toBe(5)
    expect(computeScale(740, 555)).toBe(5)
    expect(computeScale(0, 1110)).toBe(0)
    expect(computeScale(740, -1)).toBe(0)
    expect(computeScale(680, 1050, 0)).toBe(10)
  })
  it('converte metros e pixels sem perder as coordenadas', () => {
    expect(metersToPx({ x: 0, y: 0 }, 10)).toEqual({ x: 30, y: 30 })
    for (const p of [{ x: 0, y: 0 }, { x: 68, y: 105 }, { x: -2, y: 52.5 }]) {
      for (const scale of [0.5, 3.7, 10]) {
        for (const runoff of [0, 3, 5]) {
          const pixels = metersToPx(p, scale, runoff)
          const result = pxToMeters(pixels, scale, runoff)
          expect(result.x).toBeCloseTo(p.x)
          expect(result.y).toBeCloseTo(p.y)
          expect(pixels).not.toBe(p)
          expect(result).not.toBe(pixels)
        }
      }
    }
  })
  it('espelha centro, cantos e retorna ao ponto original', () => {
    expect(mirror({ x: 34, y: 52.5 })).toEqual({ x: 34, y: 52.5 })
    for (const p of [{ x: 0, y: 0 }, { x: 68, y: 0 }, { x: 0, y: 105 }, { x: 68, y: 105 }, { x: 12, y: 31 }]) {
      expect(mirror(p)).toEqual({ x: 68 - p.x, y: 105 - p.y })
      expect(mirror(mirror(p))).toEqual(p)
      expect(mirror(p)).not.toBe(p)
    }
  })
  it('converte lados sem mutar a entrada', () => {
    const p = Object.freeze({ x: 12, y: 20 })
    expect(toSide(p, 'home')).toEqual(p)
    expect(toSide(p, 'home')).not.toBe(p)
    expect(toSide(p, 'away')).toEqual({ x: 56, y: 85 })
    expect(p).toEqual({ x: 12, y: 20 })
  })
  it('inclui linhas e respeita a margem', () => {
    for (const p of [{ x: 0, y: 0 }, { x: 68, y: 105 }, { x: 0, y: 105 }, { x: 68, y: 0 }]) expect(isInsidePitch(p)).toBe(true)
    for (const p of [{ x: -1, y: 50 }, { x: 69, y: 50 }, { x: 30, y: -1 }, { x: 30, y: 106 }]) expect(isInsidePitch(p)).toBe(false)
    expect(isInsidePitch({ x: -3, y: 108 }, 3)).toBe(true)
    expect(isInsidePitch({ x: 71, y: -3 }, 3)).toBe(true)
    expect(isInsidePitch({ x: 71.1, y: 0 }, 3)).toBe(false)
  })
  it('limita cada eixo e sempre cria um objeto novo', () => {
    const p = Object.freeze({ x: 12, y: 20 })
    expect(clampToPitch(p)).toEqual(p)
    expect(clampToPitch(p)).not.toBe(p)
    expect(clampToPitch({ x: -1, y: 106 })).toEqual({ x: 0, y: 105 })
    expect(clampToPitch({ x: 69, y: -1 })).toEqual({ x: 68, y: 0 })
    expect(clampToPitch({ x: -1, y: 20 })).toEqual({ x: 0, y: 20 })
  })
  it('calcula o angulo da meia-lua pela formula oficial', () => {
    expect(penaltyArcHalfAngleDeg()).toBeCloseTo(53.05, 2)
  })
})
