/**
 * Cálculos de cor dos tokens: legibilidade do texto e distinção entre uniformes.
 * Contraste usa brilho relativo; semelhança usa distância perceptual em Lab.
 */
export interface Rgb {
  r: number
  g: number
  b: number
}

/** Aceita #RGB ou #RRGGBB e devolve canais de 0 a 255; formato inválido devolve null. */
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
  // Desfaz a curva de brilho do sRGB antes dos cálculos; os coeficientes seguem esse padrão.
  const linear = (channel: number) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return { r: linear(rgb.r), g: linear(rgb.g), b: linear(rgb.b) }
}

/** Brilho relativo WCAG (0 a 1), ponderado pela sensibilidade dos olhos; hex inválido lança erro. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = linearRgb(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function luminanceContrast(first: number, second: number): number {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

/** Razão de contraste WCAG (1 a 21); cores inválidas lançam erro. */
export function contrastRatio(a: string, b: string): number {
  return luminanceContrast(relativeLuminance(a), relativeLuminance(b))
}

export const DARK_TEXT = '#0F1418'
export const LIGHT_TEXT = '#FFFFFF'
const darkTextLuminance = relativeLuminance(DARK_TEXT)
const lightTextLuminance = relativeLuminance(LIGHT_TEXT)

/** Escolhe o texto claro ou escuro com maior contraste sobre o fundo do token. */
export function textColorOn(background: string): typeof DARK_TEXT | typeof LIGHT_TEXT {
  const luminance = relativeLuminance(background)
  return luminanceContrast(luminance, lightTextLuminance) >= luminanceContrast(luminance, darkTextLuminance) ? LIGHT_TEXT : DARK_TEXT
}

/** Cores candidatas ao uniforme do goleiro, escolhido para se distinguir do time. */
export const GOALKEEPER_PALETTE: readonly string[] = ['#FACC15', '#22D3EE', '#F472B6', '#A3E635', '#FB923C', '#FFFFFF', '#111827']

/** Escolhe na paleta a cor perceptualmente mais distante da cor do time. */
export function contrastColor(teamColor: string): string {
  const teamLab = toLab(teamColor)
  let best = GOALKEEPER_PALETTE[0]!
  let distance = labDistance(teamLab, toLab(best))
  for (const color of GOALKEEPER_PALETTE.slice(1)) {
    const candidateDistance = labDistance(teamLab, toLab(color))
    if (candidateDistance > distance) {
      best = color
      distance = candidateDistance
    }
  }
  return best
}

type Lab = readonly [number, number, number]

function toLab(hex: string): Lab {
  const { r, g, b } = linearRgb(hex)
  // Converte sRGB linear para Lab via XYZ, normalizado pelo branco D65 (referência de luz do dia).
  const transform = (value: number) => value > (6 / 29) ** 3 ? Math.cbrt(value) : value / (3 * (6 / 29) ** 2) + 4 / 29
  const x = transform((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047)
  const y = transform(0.2126729 * r + 0.7151522 * g + 0.072175 * b)
  const z = transform((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

function labDistance(first: Lab, second: Lab): number {
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2])
}

/** ΔE76: distância entre cores no espaço Lab; quanto menor, mais parecidas. Hex inválido lança erro. */
export function deltaE76(a: string, b: string): number {
  return labDistance(toLab(a), toLab(b))
}

/** Distância ΔE76 abaixo da qual o app avisa que os uniformes são parecidos. */
export const SIMILAR_COLOR_THRESHOLD = 25

/** Compara a distância perceptual ao limite de semelhança dos uniformes. */
export function areColorsSimilar(a: string, b: string, threshold: number = SIMILAR_COLOR_THRESHOLD): boolean {
  return deltaE76(a, b) < threshold
}

/** Primeira candidata válida distinta do time e do goleiro dele; null se nenhuma servir. */
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
