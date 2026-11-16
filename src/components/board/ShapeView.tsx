// Render Konva de um desenho (traço livre, flechas, retângulo, elipse, texto), em metros.
import { memo } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import { parseHex, textColorOn } from '@/lib/colors'
import {
  FILL_OPACITY,
  STROKE_WIDTH_M,
  arrowHead,
  arrowHeadSize,
  arrowShaft,
  strokeWidthOf,
  type ArrowShape,
  type CurveShape,
  type DrawShape,
  type ShapeStyle,
} from '@/lib/geometry/shapes'
import type { Point } from '@/lib/geometry/pitch'
import { Ellipse, Group, Line, Rect, Shape, Text } from './konvaNodes'

/** Área extra de clique (m) em volta de traços finos, para selecionar sem precisar de precisão. */
const HIT_STROKE = 1.6
/** Contorno (m de cada lado) das flechas, para destacar do gramado e das linhas. */
const OUTLINE = 0.16

/** Cor hex com transparência (`alpha` de 0 a 1), em rgba. */
function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex)
  return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})` : hex
}

/** `dashBase`: largura que define o padrão do tracejado (o contorno usa a do traço, para os traços coincidirem). */
function strokeProps(style: ShapeStyle, width = STROKE_WIDTH_M[style.width], stroke = style.color, dashBase = width) {
  return {
    stroke,
    strokeWidth: width,
    // Tracejado: traço de 3 larguras e vão de 2,2, proporcional à espessura.
    dash: style.dashed ? [dashBase * 3, dashBase * 2.2] : undefined,
    hitStrokeWidth: Math.max(HIT_STROKE, width),
    // Dispensa o canvas auxiliar que o Konva usa em formas com contorno, preenchimento e opacidade: mais leve.
    perfectDrawEnabled: false,
  }
}

/** Pontos no formato que o Konva espera: [x1, y1, x2, y2, ...]. */
const flat = (points: readonly Point[]) => points.flatMap((p) => [p.x, p.y])

/** Escuro sob cores claras, claro sob cores escuras (ex.: flecha preta). */
function outlineColor(color: string): string {
  return withAlpha(textColorOn(color), 0.85)
}

/**
 * Flecha reta ou curva com contorno: primeiro os contornos (corpo e ponta), depois as cores por cima,
 * assim a borda nunca cruza a junção entre corpo e ponta. O corpo para no meio da ponta (`arrowShaft`).
 */
function ArrowView({ shape }: { shape: ArrowShape | CurveShape }) {
  const style = shape.style
  const width = strokeWidthOf(shape)
  const outline = outlineColor(style.color)
  const shaft = arrowShaft(shape)
  const head = flat(arrowHead(shape.type === 'curve' ? shape.control : shape.from, shape.to, arrowHeadSize(style)))
  const control = shaft.control
  const body = (color: string, w: number, key: string) =>
    control ? (
      // A curva é uma Bézier quadrática desenhada à mão no `sceneFunc` (o Konva não tem essa forma pronta).
      <Shape
        key={key}
        {...strokeProps(style, w, color, width)}
        lineCap="butt"
        sceneFunc={(ctx, node) => {
          ctx.beginPath()
          ctx.moveTo(shaft.from.x, shaft.from.y)
          ctx.quadraticCurveTo(control.x, control.y, shaft.to.x, shaft.to.y)
          ctx.strokeShape(node)
        }}
      />
    ) : (
      <Line key={key} points={flat([shaft.from, shaft.to])} lineCap="butt" {...strokeProps(style, w, color, width)} />
    )
  return (
    <>
      {body(outline, width + OUTLINE * 2, 'body-outline')}
      <Line points={head} closed fill={outline} stroke={outline} strokeWidth={OUTLINE * 2} lineJoin="round" />
      {body(style.color, width, 'body')}
      <Line points={head} closed fill={style.color} />
    </>
  )
}

interface ShapeViewProps {
  shape: DrawShape
  /** Selecionar ativo: o desenho responde a clique e arrasto. */
  interactive: boolean
  onSelect?: (shape: DrawShape) => void
  onMoved?: (shape: DrawShape, dx: number, dy: number) => void
  onEditText?: (shape: DrawShape) => void
}

/**
 * Um desenho, em metros, dentro de um Group na origem. Ao arrastar, o Group se desloca;
 * no fim o deslocamento vira `onMoved` e o Group volta para a origem (as coordenadas ficam na forma).
 * Com `memo`, selecionar um desenho não redesenha os outros; por isso os handlers são funções de
 * módulo que recebem o desenho, e não funções criadas a cada render.
 */
export const ShapeView = memo(function ShapeView({ shape, interactive, onSelect, onMoved, onEditText }: ShapeViewProps) {
  const s = shape.style
  return (
    <Group
      listening={interactive}
      draggable={interactive}
      onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
        // Não deixa o clique chegar ao Stage, que soltaria a seleção.
        e.cancelBubble = true
        onSelect?.(shape)
      }}
      onDblClick={() => shape.type === 'text' && onEditText?.(shape)}
      onDragEnd={(e) => {
        const node = e.target
        const dx = node.x()
        const dy = node.y()
        // À mão: as props do Group não mudam (ele sempre está na origem), então o react-konva não o reposicionaria.
        node.position({ x: 0, y: 0 })
        if (dx !== 0 || dy !== 0) onMoved?.(shape, dx, dy)
      }}
    >
      {shape.type === 'free' ? (
        <Line points={flat(shape.points)} lineCap="round" lineJoin="round" {...strokeProps(s)} />
      ) : null}
      {shape.type === 'arrow' || shape.type === 'curve' ? <ArrowView shape={shape} /> : null}
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
})
