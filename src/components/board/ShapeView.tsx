import type { KonvaEventObject } from 'konva/lib/Node'
import { Ellipse, Group, Line, Rect, Shape, Text } from 'react-konva'
import { parseHex } from '@/lib/colors'
import {
  FILL_OPACITY,
  STROKE_WIDTH_M,
  arrowHead,
  arrowHeadSize,
  type DrawShape,
  type ShapeStyle,
} from '@/lib/geometry/shapes'
import type { Point } from '@/lib/geometry/pitch'

/** Área extra de clique (m) em volta de traços finos, para selecionar sem precisar de precisão. */
const HIT_STROKE = 1.6

function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex)
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})` : hex
}

function strokeProps(style: ShapeStyle) {
  const width = STROKE_WIDTH_M[style.width]
  return {
    stroke: style.color,
    strokeWidth: width,
    dash: style.dashed ? [width * 3, width * 2.2] : undefined,
    hitStrokeWidth: Math.max(HIT_STROKE, width),
    perfectDrawEnabled: false,
  }
}

const flat = (points: readonly Point[]) => points.flatMap((p) => [p.x, p.y])

function Head({ from, to, style }: { from: Point; to: Point; style: ShapeStyle }) {
  const [left, tip, right] = arrowHead(from, to, arrowHeadSize(style))
  return <Line points={flat([left, tip, right])} closed fill={style.color} stroke={style.color} strokeWidth={0.05} />
}

interface ShapeViewProps {
  shape: DrawShape
  /** Selecionar ativo: o desenho responde a clique e arrasto. */
  interactive: boolean
  onSelect?: () => void
  onMoved?: (dx: number, dy: number) => void
  onEditText?: () => void
}

/**
 * Um desenho, em metros, dentro de um Group na origem. Ao arrastar, o Group se desloca;
 * no fim o deslocamento vira `onMoved` e o Group volta para a origem (as coordenadas ficam na forma).
 */
export function ShapeView({ shape, interactive, onSelect, onMoved, onEditText }: ShapeViewProps) {
  const s = shape.style
  return (
    <Group
      listening={interactive}
      draggable={interactive}
      onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true
        onSelect?.()
      }}
      onDblClick={() => shape.type === 'text' && onEditText?.()}
      onDragEnd={(e) => {
        const node = e.target
        const dx = node.x()
        const dy = node.y()
        node.position({ x: 0, y: 0 })
        if (dx !== 0 || dy !== 0) onMoved?.(dx, dy)
      }}
    >
      {shape.type === 'free' ? (
        <Line points={flat(shape.points)} lineCap="round" lineJoin="round" {...strokeProps(s)} />
      ) : null}
      {shape.type === 'arrow' ? (
        <>
          <Line points={flat([shape.from, shape.to])} lineCap="butt" {...strokeProps(s)} />
          <Head from={shape.from} to={shape.to} style={s} />
        </>
      ) : null}
      {shape.type === 'curve' ? (
        <>
          <Shape
            {...strokeProps(s)}
            lineCap="butt"
            sceneFunc={(ctx, node) => {
              ctx.beginPath()
              ctx.moveTo(shape.from.x, shape.from.y)
              ctx.quadraticCurveTo(shape.control.x, shape.control.y, shape.to.x, shape.to.y)
              ctx.strokeShape(node)
            }}
          />
          <Head from={shape.control} to={shape.to} style={s} />
        </>
      ) : null}
      {shape.type === 'rect' ? (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={withAlpha(s.color, FILL_OPACITY)}
          {...strokeProps(s)}
        />
      ) : null}
      {shape.type === 'ellipse' ? (
        <Ellipse
          x={shape.cx}
          y={shape.cy}
          radiusX={shape.rx}
          radiusY={shape.ry}
          fill={withAlpha(s.color, FILL_OPACITY)}
          {...strokeProps(s)}
        />
      ) : null}
      {shape.type === 'text' ? (
        <Text
          x={shape.x}
          y={shape.y}
          text={shape.text}
          fontSize={shape.fontSize}
          lineHeight={1.2}
          fontFamily="Barlow Condensed, Barlow, sans-serif"
          fontStyle="700"
          fill={s.color}
          shadowColor="black"
          shadowOpacity={0.6}
          shadowBlur={0.4}
        />
      ) : null}
    </Group>
  )
}
