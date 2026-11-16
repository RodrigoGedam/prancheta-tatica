/**
 * Camadas Konva dos desenhos. `ShapesLayer` mostra os desenhos salvos e permite selecioná-los, movê-los e
 * ajustar a curva (só com Selecionar). `CaptureLayer` existe só com uma ferramenta de desenho: fica por
 * cima de tudo, recebe o ponteiro e cria os desenhos novos ou apaga com a borracha.
 */
import { memo, useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
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
import { Circle, Group, Layer, Line, Rect } from './konvaNodes'

/** Tamanho do texto (m) conforme a espessura escolhida. */
const TEXT_SIZE: Record<StrokeWidth, number> = { thin: 1.8, medium: 2.3, thick: 3 }
/** Tolerância (m) da borracha. */
const ERASER_TOLERANCE = 0.8
/** Tolerância (m) da simplificação do traço livre. */
const FREE_EPSILON = 0.12
/** Cor da moldura de seleção. O canvas não lê variáveis CSS, então o token de `styles.css` é repetido aqui. */
const ACCENT = '#F3D6A6'

const newShapeId = () => crypto.randomUUID()

interface ScaledProps {
  scale: number
}

/**
 * Group que converte metros do campo em pixels do Stage (mesmo esquema dos tokens): escala `scale`
 * (pixels por metro) e deslocamento da faixa `RUNOFF` em volta do campo. Os filhos usam metros.
 */
function PitchGroup({ scale, children, groupRef }: ScaledProps & { children: ReactNode; groupRef?: Ref<Konva.Group> }) {
  return (
    <Group ref={groupRef} x={RUNOFF * scale} y={RUNOFF * scale} scaleX={scale} scaleY={scale}>
      {children}
    </Group>
  )
}

// Handlers de módulo (não recriados a cada render), para não anular o `memo` de ShapeView.
// Selecionar traz o estilo do desenho para a toolbar.
function selectShape(shape: DrawShape) {
  useToolStore.getState().select(shape.id, shape.style)
}

function moveShape(shape: DrawShape, dx: number, dy: number) {
  useBoardStore.getState().updateShape(translateShape(shape, dx, dy))
}

function editTextShape(shape: DrawShape) {
  // A edição inteira do texto vira um passo só no histórico.
  beginHistoryBatch()
  useToolStore.getState().editText(shape.id)
}

/**
 * Desenhos já feitos, com seleção e ponto de controle da curva (ferramenta Selecionar).
 * Com `memo` (memoização: só re-renderiza se as props mudarem), o hover de um token não redesenha os desenhos.
 */
export const ShapesLayer = memo(function ShapesLayer({ scale }: ScaledProps) {
  const shapes = useBoardStore((s) => s.shapes)
  const interactive = useToolStore((s) => s.tool === 'select')
  const selectedId = useToolStore((s) => s.selectedId)
  const editingTextId = useToolStore((s) => s.editingTextId)
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
              onSelect={selectShape}
              onMoved={moveShape}
              onEditText={editTextShape}
            />
          ),
        )}
        {selected && selected.id !== editingTextId ? <Selection shape={selected} scale={scale} /> : null}
      </PitchGroup>
    </Layer>
  )
})

/** Moldura tracejada do desenho selecionado e, na curva, o ponto de controle arrastável. */
function Selection({ shape, scale }: { shape: DrawShape; scale: number }) {
  const b = shapeBounds(shape)
  /** Folga (m) entre o desenho e a moldura. */
  const pad = 0.6
  // Um pixel de tela em metros: traços e raios multiplicados por `px` têm o mesmo tamanho em qualquer escala.
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
            fill="#150B0F"
            stroke={ACCENT}
            strokeWidth={2 * px}
            hitStrokeWidth={10 * px}
            draggable
            // `cancelBubble` impede que o clique suba até o Stage, que soltaria a seleção (ver Board.tsx).
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

/**
 * Desenho que um arrasto de `a` até `b` produz com a ferramenta (null para texto e borracha).
 * Tem `default`: um tipo de desenho novo precisa de um caso aqui, e o compilador não avisa.
 */
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

/**
 * Desenho mais de cima sob o ponto (para a borracha). Com uma ferramenta de desenho a ShapesLayer não
 * recebe eventos, então o acerto é calculado aqui, com `hitTest`, do último desenho para o primeiro.
 */
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
 * O rascunho é estado local: o store só recebe o desenho no mouseup, como um único passo de desfazer.
 */
export function CaptureLayer({ scale }: ScaledProps) {
  const tool = useToolStore((s) => s.tool)
  const groupRef = useRef<Konva.Group>(null)
  // O rascunho guarda a ferramenta que o criou: se a ferramenta mudar no meio do gesto, ele some.
  const [draft, setDraft] = useState<{ tool: Tool; shape: DrawShape } | null>(null)
  // Gesto em andamento, em ref (não em estado) para os handlers lerem o valor atual sem esperar um render.
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
  // Posição do ponteiro relativa ao PitchGroup, que desfaz a escala: já vem em metros.
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
      // `y` é o topo do texto; subir 60% da fonte põe o ponto clicado perto do meio da primeira linha.
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
    if (tool === 'eraser') {
      const p = erasing.current ? pointer() : null
      if (p) erase(p)
      return
    }
    const d = drag.current
    if (!d) return
    const p = pointer()
    if (!p) return
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
    // Simplifica o traço livre (menos pontos para salvar) e descarta o clique sem arrasto.
    if (shape.type === 'free') shape = { ...shape, points: simplifyPath(shape.points, FREE_EPSILON) }
    if (isDegenerate(shape)) return
    useBoardStore.getState().addShape(shape)
    // A curva já nasce selecionada para ajustar o ponto de controle.
    if (shape.type === 'curve') {
      useToolStore.getState().setTool('select')
      useToolStore.getState().select(shape.id, shape.style)
    }
  }

  // Retângulo transparente do tamanho do campo mais a faixa em volta: é ele que recebe o ponteiro.
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
