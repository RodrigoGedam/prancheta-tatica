import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Circle, Group, Layer, Line, Rect } from 'react-konva'
import { PITCH, RUNOFF, type Point } from '@/lib/geometry/pitch'
import {
  defaultControlPoint,
  ellipseFromDrag,
  hitTest,
  isDegenerate,
  rectFromDrag,
  shapeBounds,
  simplifyPath,
  translateShape,
  type DrawShape,
  type ShapeStyle,
  type StrokeWidth,
} from '@/lib/geometry/shapes'
import { beginHistoryBatch, endHistoryBatch, useBoardStore } from '@/stores/boardStore'
import { useToolStore, type Tool } from '@/stores/toolStore'
import { ShapeView } from './ShapeView'

/** Tamanho do texto (m) conforme a espessura escolhida. */
export const TEXT_SIZE: Record<StrokeWidth, number> = { thin: 1.8, medium: 2.3, thick: 3 }
/** Tolerância (m) da borracha. */
const ERASER_TOLERANCE = 0.8
/** Tolerância (m) da simplificação do traço livre. */
const FREE_EPSILON = 0.12
const ACCENT = '#B8F23C'

export const newShapeId = () => crypto.randomUUID()

interface ScaledProps {
  scale: number
}

/** Group que converte metros do campo em pixels do Stage (mesmo esquema dos tokens). */
function PitchGroup({ scale, children, groupRef }: ScaledProps & { children: ReactNode; groupRef?: Ref<Konva.Group> }) {
  return (
    <Group ref={groupRef} x={RUNOFF * scale} y={RUNOFF * scale} scaleX={scale} scaleY={scale}>
      {children}
    </Group>
  )
}

/** Desenhos já feitos, com seleção e ponto de controle da curva (ferramenta Selecionar). */
export function ShapesLayer({ scale }: ScaledProps) {
  const shapes = useBoardStore((s) => s.shapes)
  const tool = useToolStore((s) => s.tool)
  const selectedId = useToolStore((s) => s.selectedId)
  const editingTextId = useToolStore((s) => s.editingTextId)
  const interactive = tool === 'select'
  const selected = interactive ? shapes.find((s) => s.id === selectedId) : undefined

  return (
    <Layer listening={interactive}>
      <PitchGroup scale={scale}>
        {shapes.map((shape) =>
          // O texto em edição aparece no overlay HTML, não no canvas.
          shape.id === editingTextId ? null : (
            <ShapeView
              key={shape.id}
              shape={shape}
              interactive={interactive}
              onSelect={() => useToolStore.getState().select(shape.id, shape.style)}
              onMoved={(dx, dy) => useBoardStore.getState().updateShape(translateShape(shape, dx, dy))}
              onEditText={() => {
                // A edição inteira do texto vira um passo só no histórico.
                beginHistoryBatch()
                useToolStore.getState().editText(shape.id)
              }}
            />
          ),
        )}
        {selected && selected.id !== editingTextId ? <Selection shape={selected} scale={scale} /> : null}
      </PitchGroup>
    </Layer>
  )
}

function Selection({ shape, scale }: { shape: DrawShape; scale: number }) {
  const b = shapeBounds(shape)
  const pad = 0.6
  const px = 1 / scale
  return (
    <>
      <Rect
        x={b.x - pad}
        y={b.y - pad}
        width={b.width + pad * 2}
        height={b.height + pad * 2}
        stroke={ACCENT}
        strokeWidth={1.5 * px}
        dash={[5 * px, 4 * px]}
        listening={false}
      />
      {shape.type === 'curve' ? (
        <>
          <Line
            points={[shape.from.x, shape.from.y, shape.control.x, shape.control.y, shape.to.x, shape.to.y]}
            stroke={ACCENT}
            strokeWidth={px}
            dash={[3 * px, 3 * px]}
            listening={false}
          />
          <Circle
            x={shape.control.x}
            y={shape.control.y}
            radius={6 * px}
            fill="#0F1418"
            stroke={ACCENT}
            strokeWidth={2 * px}
            hitStrokeWidth={10 * px}
            draggable
            onMouseDown={(e) => {
              e.cancelBubble = true
            }}
            // O arrasto do ponto de controle atualiza ao vivo, mas vira um passo só no histórico.
            onDragStart={beginHistoryBatch}
            onDragEnd={endHistoryBatch}
            onMouseEnter={(e) => {
              const stage = e.target.getStage()
              if (stage) stage.container().style.cursor = 'move'
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage()
              if (stage) stage.container().style.cursor = ''
            }}
            onDragMove={(e) => {
              // Atualiza ao vivo para a curva acompanhar o ponto.
              useBoardStore.getState().updateShape({ ...shape, control: { x: e.target.x(), y: e.target.y() } })
            }}
          />
        </>
      ) : null}
    </>
  )
}

function makeDraft(tool: Tool, a: Point, b: Point, style: ShapeStyle, id: string, points: Point[]): DrawShape | null {
  switch (tool) {
    case 'free':
      return { id, type: 'free', style, points }
    case 'arrow':
      return { id, type: 'arrow', style, from: a, to: b }
    case 'curve':
      return { id, type: 'curve', style, from: a, to: b, control: defaultControlPoint(a, b) }
    case 'rect':
      return { id, type: 'rect', style, ...rectFromDrag(a, b) }
    case 'ellipse':
      return { id, type: 'ellipse', style, ...ellipseFromDrag(a, b) }
    default:
      return null
  }
}

/** Desenho mais de cima sob o ponto (para a borracha). */
function topmostAt(shapes: readonly DrawShape[], point: Point): DrawShape | undefined {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i]
    if (shape && hitTest(shape, point, ERASER_TOLERANCE)) return shape
  }
  return undefined
}

/**
 * Captura o ponteiro com as ferramentas de desenho (fica acima dos tokens, que só respondem no Selecionar).
 * Desenha livre, flechas, retângulo e círculo arrastando; texto com um clique; borracha clicando ou passando.
 */
export function CaptureLayer({ scale }: ScaledProps) {
  const tool = useToolStore((s) => s.tool)
  const groupRef = useRef<Konva.Group>(null)
  // O rascunho guarda a ferramenta que o criou: se a ferramenta mudar no meio do gesto, ele some.
  const [draft, setDraft] = useState<{ tool: Tool; shape: DrawShape } | null>(null)
  const drag = useRef<{ start: Point; last: Point; points: Point[]; id: string } | null>(null)
  const erasing = useRef(false)

  // Esc cancela o desenho em andamento.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drag.current) {
        drag.current = null
        setDraft(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Trocar de ferramenta abandona o gesto em andamento (a camada pode sumir antes do mouseup).
  useEffect(() => {
    drag.current = null
    erasing.current = false
    endHistoryBatch()
    if (tool !== 'select') return
    // Volta o cursor ao normal quando sai das ferramentas de desenho.
    const container = groupRef.current?.getStage()?.container() ?? document.querySelector<HTMLElement>('.konvajs-content')
    if (container) container.style.cursor = ''
  }, [tool])

  if (tool === 'select') return null

  const withTool = (shape: DrawShape | null) => (shape ? { tool, shape } : null)
  const pointer = (): Point | null => groupRef.current?.getRelativePointerPosition() ?? null

  function erase(point: Point) {
    const target = topmostAt(useBoardStore.getState().shapes, point)
    if (target) useBoardStore.getState().removeShape(target.id)
  }

  function onDown(e: KonvaEventObject<MouseEvent>) {
    if (e.evt.button !== 0) return
    const p = pointer()
    if (!p) return
    const { style } = useToolStore.getState()
    if (tool === 'eraser') {
      // Passar a borracha por vários desenhos é um passo só.
      beginHistoryBatch()
      erasing.current = true
      erase(p)
      return
    }
    if (tool === 'text') {
      const id = newShapeId()
      // Fecha antes o texto em edição (o blur dele viria só depois deste mousedown).
      if (document.activeElement instanceof HTMLTextAreaElement) document.activeElement.blur()
      // Criar + digitar o texto vira um passo só (texto vazio é descartado sem deixar rastro).
      beginHistoryBatch()
      useBoardStore
        .getState()
        .addShape({ id, type: 'text', style, x: p.x, y: p.y - TEXT_SIZE[style.width] * 0.6, text: '', fontSize: TEXT_SIZE[style.width] })
      useToolStore.getState().editText(id)
      return
    }
    drag.current = { start: p, last: p, points: [p], id: newShapeId() }
    setDraft(withTool(makeDraft(tool, p, p, style, drag.current.id, [p])))
  }

  function onMove() {
    const p = pointer()
    if (!p) return
    if (tool === 'eraser') {
      if (erasing.current) erase(p)
      return
    }
    const d = drag.current
    if (!d) return
    d.last = p
    if (tool === 'free') d.points.push(p)
    setDraft(withTool(makeDraft(tool, d.start, p, useToolStore.getState().style, d.id, [...d.points])))
  }

  function onUp() {
    if (erasing.current) endHistoryBatch()
    erasing.current = false
    const d = drag.current
    drag.current = null
    setDraft(null)
    if (!d) return
    let shape = makeDraft(tool, d.start, d.last, useToolStore.getState().style, d.id, d.points)
    if (!shape) return
    if (shape.type === 'free') shape = { ...shape, points: simplifyPath(shape.points, FREE_EPSILON) }
    if (isDegenerate(shape)) return
    useBoardStore.getState().addShape(shape)
    // A curva já nasce selecionada para ajustar o ponto de controle.
    if (shape.type === 'curve') {
      useToolStore.getState().setTool('select')
      useToolStore.getState().select(shape.id, shape.style)
    }
  }

  return (
    <Layer>
      <PitchGroup scale={scale} groupRef={groupRef}>
        <Rect
          x={-RUNOFF}
          y={-RUNOFF}
          width={PITCH.width + 2 * RUNOFF}
          height={PITCH.length + 2 * RUNOFF}
          fill="rgba(0,0,0,0)"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onMouseEnter={(e) => {
            const stage = e.target.getStage()
            if (stage) stage.container().style.cursor = tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair'
          }}
        />
        {draft && draft.tool === tool ? <ShapeView shape={draft.shape} interactive={false} /> : null}
      </PitchGroup>
    </Layer>
  )
}
