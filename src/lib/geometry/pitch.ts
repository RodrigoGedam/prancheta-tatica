/**
 * Geometria do campo (lógica pura). Coordenadas em METROS.
 * Campo vertical: x = largura (0..68, esquerda → direita), y = comprimento (0..105, cima → baixo).
 * Mandante ("home") joga embaixo; visitante ("away") em cima.
 */

export type Point = { x: number; y: number }
export type Side = 'home' | 'away'

/** Dimensões do campo em metros; a origem fica no canto superior esquerdo. */
export const PITCH = { width: 68, length: 105 } as const

/** Medidas das marcações em metros; o raio dos pontos define sua aparência na prancheta. */
export const MARKINGS = {
  lineWidth: 0.12,
  centerCircleRadius: 9.15,
  centerSpotRadius: 0.3,
  penaltyAreaWidth: 40.32,
  penaltyAreaDepth: 16.5,
  goalAreaWidth: 18.32,
  goalAreaDepth: 5.5,
  penaltySpotDistance: 11,
  penaltyArcRadius: 9.15,
  cornerArcRadius: 1,
  goalWidth: 7.32,
} as const

/** Área em volta do campo (metros) onde tokens ainda podem ficar sem cortar. */
export const RUNOFF = 3

/**
 * Pixels por metro para caber o campo + `runoff` de cada lado dentro do container.
 * Retorna 0 se o container tiver largura ou altura <= 0.
 */
export function computeScale(containerWidth: number, containerHeight: number, runoff: number = RUNOFF): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 0
  return Math.min(containerWidth / (PITCH.width + 2 * runoff), containerHeight / (PITCH.length + 2 * runoff))
}

/** Converte pixels do canvas em metros do campo, descontando a margem; exige escala positiva. */
export function pxToMeters(p: Point, scale: number, runoff: number = RUNOFF): Point {
  return { x: p.x / scale - runoff, y: p.y / scale - runoff }
}

/** Espelha um ponto pelo centro do campo (time de baixo → time de cima). */
export function mirror(p: Point): Point {
  return { x: PITCH.width - p.x, y: PITCH.length - p.y }
}

/** Dentro do campo (linhas inclusas), com `margin` metros de tolerância para fora. */
export function isInsidePitch(p: Point, margin: number = 0): boolean {
  return p.x >= -margin && p.x <= PITCH.width + margin && p.y >= -margin && p.y <= PITCH.length + margin
}

/**
 * Meia-lua: metade do ângulo (em graus) do arco do círculo do pênalti que fica FORA da grande área.
 * acos((penaltyAreaDepth - penaltySpotDistance) / penaltyArcRadius) em graus (~53,05°).
 */
export function penaltyArcHalfAngleDeg(): number {
  return Math.acos((MARKINGS.penaltyAreaDepth - MARKINGS.penaltySpotDistance) / MARKINGS.penaltyArcRadius) * 180 / Math.PI
}
