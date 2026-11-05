import type { KonvaEventObject } from 'konva/lib/Node'
import { Circle, Group, Rect, Text } from 'react-konva'
import { textColorOn } from '@/lib/colors'

/** Medidas do token em metros (o Group pai converte para pixels). */
export const TOKEN_RADIUS = 2.2
const LABEL_FONT = 1.45
const LABEL_HEIGHT = 2.1
const LABEL_WIDTH = 12

interface PlayerTokenProps {
  x: number
  y: number
  fill: string
  mark: string
  label: string
  stackSize: number
  showBadge: boolean
  draggable: boolean
  onDragStart: () => void
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void
  onHover: (hovering: boolean) => void
}

export function PlayerToken({
  x,
  y,
  fill,
  mark,
  label,
  stackSize,
  showBadge,
  draggable,
  onDragStart,
  onDragEnd,
  onHover,
}: PlayerTokenProps) {
  const ink = textColorOn(fill)
  const markFont = mark.length > 2 ? 1.55 : 2.05
  // Largura aproximada do texto (Barlow ~0,55 em por caractere) + respiro; limitada a LABEL_WIDTH.
  const pillWidth = Math.min(LABEL_WIDTH, label.length * LABEL_FONT * 0.55 + 1.2)
  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragStart={(e) => {
        e.target.moveToTop()
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={(e) => {
        onHover(true)
        const stage = e.target.getStage()
        if (stage && draggable) stage.container().style.cursor = 'grab'
      }}
      onMouseLeave={(e) => {
        onHover(false)
        const stage = e.target.getStage()
        if (stage) stage.container().style.cursor = ''
      }}
    >
      <Circle
        radius={TOKEN_RADIUS}
        fill={fill}
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={0.26}
        shadowColor="black"
        shadowOpacity={0.4}
        shadowBlur={0.8}
        shadowOffsetY={0.25}
      />
      <Text
        text={mark}
        x={-TOKEN_RADIUS}
        y={-TOKEN_RADIUS}
        width={TOKEN_RADIUS * 2}
        height={TOKEN_RADIUS * 2}
        align="center"
        verticalAlign="middle"
        fontFamily="Barlow Condensed, Barlow, sans-serif"
        fontStyle="700"
        fontSize={markFont}
        fill={ink}
        listening={false}
      />
      <Group y={TOKEN_RADIUS + 0.35} listening={false}>
        <Rect
          x={-pillWidth / 2}
          width={pillWidth}
          height={LABEL_HEIGHT}
          fill="rgba(10,14,18,0.72)"
          cornerRadius={0.5}
        />
        <Text
          text={label}
          x={-pillWidth / 2}
          width={pillWidth}
          height={LABEL_HEIGHT}
          align="center"
          verticalAlign="middle"
          wrap="none"
          ellipsis
          fontFamily="Barlow, sans-serif"
          fontStyle="600"
          fontSize={LABEL_FONT}
          fill="#FFFFFF"
        />
      </Group>
      {showBadge && stackSize > 1 ? (
        <Group x={TOKEN_RADIUS * 0.85} y={-TOKEN_RADIUS * 0.85} listening={false}>
          <Circle radius={1.05} fill="#B8F23C" stroke="#0F1418" strokeWidth={0.2} />
          <Text
            text={`+${stackSize - 1}`}
            x={-1.05}
            y={-1.05}
            width={2.1}
            height={2.1}
            align="center"
            verticalAlign="middle"
            fontFamily="Barlow, sans-serif"
            fontStyle="700"
            fontSize={1}
            fill="#0F1418"
          />
        </Group>
      ) : null}
    </Group>
  )
}
