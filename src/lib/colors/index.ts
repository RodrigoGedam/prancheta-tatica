export interface Rgb {
  r: number
  g: number
  b: number
}

export function parseHex(hex: string): Rgb | null {
  const value = hex.trim()
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return null
  const digits = value.slice(1)
  const full = digits.length === 3 ? [...digits].map((c) => c + c).join('') : digits
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) }
}

function linearRgb(hex: string): Rgb {
  const rgb = parseHex(hex)
  if (!rgb) throw new Error(`Cor inválida: ${hex}`)
  const linear = (channel: number) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return { r: linear(rgb.r), g: linear(rgb.g), b: linear(rgb.b) }
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = linearRgb(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a)
  const second = relativeLuminance(b)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

export const DARK_TEXT = '#0F1418'
export const LIGHT_TEXT = '#FFFFFF'

export function textColorOn(background: string): typeof DARK_TEXT | typeof LIGHT_TEXT {
  return contrastRatio(background, LIGHT_TEXT) >= contrastRatio(background, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT
}

export const GOALKEEPER_PALETTE: readonly string[] = ['#FACC15', '#22D3EE', '#F472B6', '#A3E635', '#FB923C', '#FFFFFF', '#111827']

export function contrastColor(teamColor: string): string {
  let best = GOALKEEPER_PALETTE[0]!
  let distance = deltaE76(teamColor, best)
  for (const color of GOALKEEPER_PALETTE.slice(1)) {
    const candidateDistance = deltaE76(teamColor, color)
    if (candidateDistance > distance) {
      best = color
      distance = candidateDistance
    }
  }
  return best
}

function toLab(hex: string): readonly [number, number, number] {
  const { r, g, b } = linearRgb(hex)
  const transform = (value: number) => value > (6 / 29) ** 3 ? Math.cbrt(value) : value / (3 * (6 / 29) ** 2) + 4 / 29
  const x = transform((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047)
  const y = transform(0.2126729 * r + 0.7151522 * g + 0.072175 * b)
  const z = transform((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

export function deltaE76(a: string, b: string): number {
  const first = toLab(a)
  const second = toLab(b)
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2])
}

export const SIMILAR_COLOR_THRESHOLD = 25

export function areColorsSimilar(a: string, b: string, threshold: number = SIMILAR_COLOR_THRESHOLD): boolean {
  return deltaE76(a, b) < threshold
}

export function pickAlternativeColor(against: string, candidates: readonly string[]): string | null {
  const goalkeeper = contrastColor(against)
  return candidates.find((color) => parseHex(color) !== null && !areColorsSimilar(against, color) && !areColorsSimilar(goalkeeper, color)) ?? null
}
/** Mistura a cor com branco (`amount` 0..1). Usado para números legíveis no fundo escuro. */
export function lighten(hex: string, amount = 0.55): string {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  return `rgb(${mix(rgb.r)} ${mix(rgb.g)} ${mix(rgb.b)})`
}
