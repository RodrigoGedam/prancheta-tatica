import { describe, expect, it } from 'vitest'
import { parseHex, relativeLuminance, contrastRatio, textColorOn, DARK_TEXT, LIGHT_TEXT, deltaE76, areColorsSimilar, contrastColor, GOALKEEPER_PALETTE, pickAlternativeColor, lighten } from './index'

describe('cores', () => {
  it('interpreta hex com caixa livre, abreviação e espaços', () => {
    for (const hex of ['#2563EB', '#2563eb', '  #2563EB  ']) expect(parseHex(hex)).toEqual({ r: 37, g: 99, b: 235 })
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
    for (const hex of ['2563EB', '#12345', '#GGGGGG', '', 'blue', '#12345678', '#12 3456']) expect(parseHex(hex)).toBeNull()
  })
  it('calcula luminância e contraste WCAG', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1)
    expect(relativeLuminance('#000000')).toBe(0)
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21)
    expect(contrastRatio('#2563EB', '#2563EB')).toBe(1)
    expect(contrastRatio('#2563EB', '#fff')).toBe(contrastRatio('#fff', '#2563EB'))
    // Canal 10 fica abaixo do limiar; canal 11 fica acima.
    expect(relativeLuminance('#0a0a0a')).toBeCloseTo((10 / 255) / 12.92, 12)
    expect(relativeLuminance('#0b0b0b')).toBeCloseTo(((11 / 255 + 0.055) / 1.055) ** 2.4, 12)
  })
  it('rejeita cores inválidas com mensagem em português', () => {
    expect(() => relativeLuminance('blue')).toThrow('Cor inválida: blue')
    expect(() => contrastRatio('#fff', 'blue')).toThrow('Cor inválida: blue')
    expect(() => deltaE76('blue', '#fff')).toThrow('Cor inválida: blue')
    expect(() => textColorOn('blue')).toThrow('Cor inválida: blue')
    expect(() => contrastColor('blue')).toThrow('Cor inválida: blue')
  })
  it('escolhe o texto de maior contraste', () => {
    for (const color of ['#FFFFFF', '#FACC15', '#F3F4F6']) expect(textColorOn(color)).toBe(DARK_TEXT)
    for (const color of ['#000000', '#2563EB', '#1F2937', '#B91C1C']) expect(textColorOn(color)).toBe(LIGHT_TEXT)
  })
  it('preserva a escolha de contraste em toda a escala de cinza', () => {
    for (let channel = 0; channel <= 255; channel++) {
      const background = `#${channel.toString(16).padStart(2, '0').repeat(3)}`
      const expected = contrastRatio(background, LIGHT_TEXT) >= contrastRatio(background, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT
      expect(textColorOn(background)).toBe(expected)
    }
  })
  it('calcula distância CIELAB', () => {
    expect(deltaE76('#2563EB', '#2563EB')).toBe(0)
    expect(deltaE76('#2563EB', '#fff')).toBe(deltaE76('#fff', '#2563EB'))
    expect(deltaE76('#FF0000', '#00FF00')).toBeGreaterThan(150)
    expect(deltaE76('#FFFFFF', '#000000')).toBeCloseTo(100, 1)
  })
  it('compara com limiar estrito e customizado', () => {
    expect(areColorsSimilar('#2563EB', '#1D4ED8')).toBe(true)
    expect(areColorsSimilar('#2563EB', '#C2410C')).toBe(false)
    const distance = deltaE76('#2563EB', '#1D4ED8')
    expect(areColorsSimilar('#2563EB', '#1D4ED8', distance)).toBe(false)
    expect(areColorsSimilar('#2563EB', '#1D4ED8', distance + 1)).toBe(true)
  })
  it('seleciona a maior distância na paleta ordenada', () => {
    expect(GOALKEEPER_PALETTE).toEqual(['#FACC15', '#22D3EE', '#F472B6', '#A3E635', '#FB923C', '#FFFFFF', '#111827'])
    for (const team of ['#FACC15', '#FFFFFF', '#2563EB', '#000000']) {
      const selected = contrastColor(team)
      expect(GOALKEEPER_PALETTE).toContain(selected)
      expect(selected).not.toBe(team)
      for (const color of GOALKEEPER_PALETTE) expect(deltaE76(team, selected)).toBeGreaterThanOrEqual(deltaE76(team, color))
    }
  })
  it('seleciona a primeira alternativa válida distante dos dois uniformes', () => {
    expect(pickAlternativeColor('#2563EB', ['#1D4ED8', '#C2410C'])).toBe('#C2410C')
    expect(pickAlternativeColor('#2563EB', ['#2563EB', '#1D4ED8'])).toBeNull()
    expect(pickAlternativeColor('#2563EB', ['blue', '', contrastColor('#2563EB'), '#C2410C'])).toBe('#C2410C')
    expect(pickAlternativeColor('#2563EB', [])).toBeNull()
  })
})
describe('lighten', () => {
  it('mistura com branco e preserva entradas inválidas', () => {
    expect(lighten('#000000', 0.5)).toBe('rgb(128 128 128)')
    expect(lighten('#FFFFFF')).toBe('rgb(255 255 255)')
    expect(lighten('azul')).toBe('azul')
  })
})
