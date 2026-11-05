import type { Context } from 'konva/lib/Context'
import type { Shape as KonvaShape } from 'konva/lib/Shape'
import { Circle, Group, Line, Rect, Shape } from 'react-konva'
import { MARKINGS, PITCH, RUNOFF, penaltyArcHalfAngleDeg } from '@/lib/geometry/pitch'

const LINE_COLOR = 'rgba(255,255,255,0.82)'
const GRASS = '#2e7a46'
const STRIPE = '#2a713f'
const RUNOFF_GRASS = '#276a3b'
const STRIPES = 10
const GOAL_DEPTH = 1.5
/** Espessura mínima visível das linhas, em pixels. */
const MIN_LINE_PX = 1.5

const W = PITCH.width
const L = PITCH.length
const DEG = Math.PI / 180

type Props = { scale: number }

/** Campo de futebol desenhado em metros; o Group converte para pixels. */
export function PitchMarkings({ scale }: Props) {
  const stroke = Math.max(MARKINGS.lineWidth, MIN_LINE_PX / scale)
  const line = { stroke: LINE_COLOR, strokeWidth: stroke, perfectDrawEnabled: false }

  const paWidth = MARKINGS.penaltyAreaWidth
  const paX = (W - paWidth) / 2
  const gaWidth = MARKINGS.goalAreaWidth
  const gaX = (W - gaWidth) / 2
  const goalX = (W - MARKINGS.goalWidth) / 2
  const spotTop = MARKINGS.penaltySpotDistance
  const spotBottom = L - MARKINGS.penaltySpotDistance
  const half = penaltyArcHalfAngleDeg()
  const stripeLength = L / STRIPES

  return (
    <Group x={RUNOFF * scale} y={RUNOFF * scale} scaleX={scale} scaleY={scale}>
      <Rect x={-RUNOFF} y={-RUNOFF} width={W + 2 * RUNOFF} height={L + 2 * RUNOFF} fill={RUNOFF_GRASS} />
      <Rect x={0} y={0} width={W} height={L} fill={GRASS} />
      {Array.from({ length: STRIPES }, (_, i) =>
        i % 2 === 0 ? <Rect key={i} x={0} y={i * stripeLength} width={W} height={stripeLength} fill={STRIPE} /> : null,
      )}

      {/* Linhas externas e meio-campo */}
      <Rect x={0} y={0} width={W} height={L} {...line} />
      <Line points={[0, L / 2, W, L / 2]} {...line} />
      <Circle x={W / 2} y={L / 2} radius={MARKINGS.centerCircleRadius} {...line} />
      <Circle x={W / 2} y={L / 2} radius={MARKINGS.centerSpotRadius} fill={LINE_COLOR} />

      {/* Áreas de cima */}
      <Rect x={paX} y={0} width={paWidth} height={MARKINGS.penaltyAreaDepth} {...line} />
      <Rect x={gaX} y={0} width={gaWidth} height={MARKINGS.goalAreaDepth} {...line} />
      <Circle x={W / 2} y={spotTop} radius={MARKINGS.centerSpotRadius} fill={LINE_COLOR} />
      <ArcLine x={W / 2} y={spotTop} radius={MARKINGS.penaltyArcRadius} from={90 - half} to={90 + half} {...line} />
      <Rect x={goalX} y={-GOAL_DEPTH} width={MARKINGS.goalWidth} height={GOAL_DEPTH} {...line} />

      {/* Áreas de baixo */}
      <Rect x={paX} y={L - MARKINGS.penaltyAreaDepth} width={paWidth} height={MARKINGS.penaltyAreaDepth} {...line} />
      <Rect x={gaX} y={L - MARKINGS.goalAreaDepth} width={gaWidth} height={MARKINGS.goalAreaDepth} {...line} />
      <Circle x={W / 2} y={spotBottom} radius={MARKINGS.centerSpotRadius} fill={LINE_COLOR} />
      <ArcLine x={W / 2} y={spotBottom} radius={MARKINGS.penaltyArcRadius} from={270 - half} to={270 + half} {...line} />
      <Rect x={goalX} y={L} width={MARKINGS.goalWidth} height={GOAL_DEPTH} {...line} />

      {/* Escanteios */}
      <ArcLine x={0} y={0} radius={MARKINGS.cornerArcRadius} from={0} to={90} {...line} />
      <ArcLine x={W} y={0} radius={MARKINGS.cornerArcRadius} from={90} to={180} {...line} />
      <ArcLine x={W} y={L} radius={MARKINGS.cornerArcRadius} from={180} to={270} {...line} />
      <ArcLine x={0} y={L} radius={MARKINGS.cornerArcRadius} from={270} to={360} {...line} />
    </Group>
  )
}

type ArcLineProps = {
  x: number
  y: number
  radius: number
  /** Ângulos em graus, sentido horário a partir do eixo +x (y para baixo). */
  from: number
  to: number
  stroke: string
  strokeWidth: number
}

/** Arco só de contorno (o Arc do Konva é um anel preenchido). */
function ArcLine({ x, y, radius, from, to, stroke, strokeWidth }: ArcLineProps) {
  return (
    <Shape
      x={x}
      y={y}
      stroke={stroke}
      strokeWidth={strokeWidth}
      perfectDrawEnabled={false}
      sceneFunc={(ctx: Context, shape: KonvaShape) => {
        ctx.beginPath()
        ctx.arc(0, 0, radius, from * DEG, to * DEG, false)
        ctx.strokeShape(shape)
      }}
    />
  )
}
