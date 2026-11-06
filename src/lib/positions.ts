/** Posições válidas, na ordem em que aparecem nos seletores. */
export const POSITIONS = [
  'GOL',
  'LD',
  'ZAG',
  'LE',
  'VOL',
  'MC',
  'MEI',
  'MD',
  'ME',
  'PD',
  'PE',
  'SA',
  'ATA',
] as const

export type Position = (typeof POSITIONS)[number]

export function isPosition(value: string): value is Position {
  return (POSITIONS as readonly string[]).includes(value)
}
