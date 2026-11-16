import { memo, useCallback, useMemo, useRef, useState, type DragEvent } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useElementSize } from '@/hooks/useElementSize'
import { stackInfo, tokenMark } from '@/lib/board/placement'
import { PITCH, RUNOFF, computeScale, isInsidePitch, pxToMeters, type Side } from '@/lib/geometry/pitch'
import { useBoardStore } from '@/stores/boardStore'
import { useToolStore } from '@/stores/toolStore'
import { CaptureLayer, ShapesLayer } from './DrawingLayers'
import { PitchMarkings } from './PitchMarkings'
import { PlayerToken } from './PlayerToken'
import { PlayerTooltip } from './PlayerTooltip'
import { TextEditor } from './TextEditor'
import { BENCH_DRAG_MIME, benchSideAt, parseBenchDrag, useBenchDropStore } from './benchDrag'
import { Group, Layer, Stage } from './konvaNodes'
import { dropPlayer, type PlacedPlayer, type SideModel } from './useBoardModel'

// Canvas da prancheta: monta o Stage do Konva com as camadas (campo, desenhos, jogadores, captura) e
// trata os arrastos de jogador, tanto do token no campo quanto do banco (HTML) para o campo.

/** Tolerância (m) para fora das linhas ainda contar como "no campo" ao soltar. */
const DROP_MARGIN = 1.5

/** Jogador em campo com o lado e o modelo do time (cores), para os tokens dos dois times numa lista só. */
interface TokenItem extends PlacedPlayer {
  side: Side
  model: SideModel
}

type TokenDragEvent = KonvaEventObject<globalThis.DragEvent>

/** Sobre o banco do próprio time: destaca o banco e deixa o token translúcido (soltar ali tira do campo). */
function handleDragMove(item: TokenItem, e: TokenDragEvent) {
  // O arrasto do Konva é disparado por eventos de mouse, que trazem a posição na tela (clientX/Y).
  const evt = e.evt as unknown as MouseEvent
  const over = benchSideAt(evt.clientX, evt.clientY) === item.side
  useBenchDropStore.getState().setTarget(over ? item.side : null)
  e.target.opacity(over ? 0.45 : 1)
}

interface TokensLayerProps {
  tokens: readonly TokenItem[]
  stacks: ReturnType<typeof stackInfo>
  scale: number
  selecting: boolean
  onDragStart: () => void
  onDragEnd: (item: TokenItem, e: TokenDragEvent) => void
  onHover: (item: TokenItem | null) => void
}

/**
 * Tokens dos dois times numa só camada, já ordenados por `z` (o último fica por cima).
 * Com `memo`, o hover (estado do Board) não redesenha os tokens; por isso os handlers recebidos são estáveis.
 */
const TokensLayer = memo(function TokensLayer({
  tokens,
  stacks,
  scale,
  selecting,
  onDragStart,
  onDragEnd,
  onHover,
}: TokensLayerProps) {
  return (
    <Layer listening={selecting}>
      {/* Converte metros em pixels: os tokens recebem x e y em metros. */}
      <Group x={RUNOFF * scale} y={RUNOFF * scale} scaleX={scale} scaleY={scale}>
        {tokens.map((t) => {
          const key = `${t.side}:${t.player.id}`
          const stack = stacks.get(key)
          const isGk = t.player.position === 'GOL'
          return (
            <PlayerToken
              key={key}
              x={t.placement.x}
              y={t.placement.y}
              fill={isGk ? t.model.goalkeeperColor : t.model.color}
              mark={tokenMark(t.player)}
              label={t.player.nickname ?? t.player.name}
              stackSize={stack?.size ?? 1}
              showBadge={stack?.isTop ?? true}
              draggable={selecting}
              onDragStart={onDragStart}
              onDragMove={(e) => handleDragMove(t, e)}
              onDragEnd={(e) => onDragEnd(t, e)}
              onHover={(on) => onHover(on ? t : null)}
            />
          )
        })}
      </Group>
    </Layer>
  )
})

/**
 * Prancheta: o Stage tem o tamanho do campo + runoff, centralizado no container.
 * Tudo dentro do Stage é desenhado em METROS, dentro de Groups escalados.
 */
export function Board({ sides }: { sides: readonly SideModel[] }) {
  const [containerRef, { width, height }] = useElementSize<HTMLDivElement>()
  const stageRef = useRef<Konva.Stage>(null)
  const [hovered, setHovered] = useState<TokenItem | null>(null)
  const [dragging, setDragging] = useState(false)
  const [benchOver, setBenchOver] = useState(false)
  const selecting = useToolStore((s) => s.tool === 'select')

  // Pixels por metro: a maior escala em que o campo e a faixa em volta cabem no contêiner.
  const scale = computeScale(width, height)
  const stageWidth = Math.floor((PITCH.width + 2 * RUNOFF) * scale)
  const stageHeight = Math.floor((PITCH.length + 2 * RUNOFF) * scale)

  const tokens = useMemo(
    () =>
      sides
        .filter((m) => m.team && !m.hidden)
        .flatMap((m) => m.onPitch.map((p): TokenItem => ({ ...p, side: m.side, model: m })))
        .sort((a, b) => a.placement.z - b.placement.z),
    [sides],
  )
  // Pilhas = tokens no mesmo ponto; só o de cima mostra o emblema +N.
  const stacks = useMemo(
    () =>
      stackInfo(
        tokens.map((t) => ({ id: `${t.side}:${t.player.id}`, x: t.placement.x, y: t.placement.y, z: t.placement.z })),
      ),
    [tokens],
  )

  // useCallback com dependências vazias: a mesma função em todo render, para não anular o memo de TokensLayer.
  const handleDragStart = useCallback(() => {
    setDragging(true)
    setHovered(null)
  }, [])

  // Fim do arrasto de um token. Em todo desfecho o nó Konva é reposicionado à mão: ele está onde o mouse o
  // deixou, e o react-konva não reaplica `x`/`y` se o valor no store não mudou.
  const handleDragEnd = useCallback((item: TokenItem, e: TokenDragEvent) => {
    setDragging(false)
    useBenchDropStore.getState().setTarget(null)
    const node = e.target
    node.opacity(1)
    // O token está dentro do Group escalado, então x() e y() já estão em metros.
    const point = { x: node.x(), y: node.y() }
    const evt = e.evt as unknown as MouseEvent
    const benchSide = benchSideAt(evt.clientX, evt.clientY)
    if (benchSide === item.side) {
      // Solto no banco do próprio time: sai do campo (o token deixa de ser renderizado).
      useBoardStore.getState().removePlayer(item.side, item.player.id)
      return
    }
    if (benchSide || !isInsidePitch(point, DROP_MARGIN)) {
      // Fora do campo e do banco (ou no banco do outro time): volta ao lugar.
      node.position({ x: item.placement.x, y: item.placement.y })
      return
    }
    // Alinha o nó ao destino (que pode ser o ponto de encaixe numa pilha): se x ou y não mudarem,
    // o react-konva não reaplica a prop.
    node.position(dropPlayer(item.side, item.player.id, point))
  }, [])

  /**
   * Drop do HTML5 vindo do banco. O evento é do DOM, não do Konva: `setPointersPositions` informa ao Stage
   * onde está o ponteiro, e `pxToMeters` converte os pixels do Stage em metros do campo.
   */
  function handleBenchDrop(e: DragEvent<HTMLDivElement>) {
    setBenchOver(false)
    // Jogadores só se movem com a ferramenta Selecionar.
    if (useToolStore.getState().tool !== 'select') return
    const data = parseBenchDrag(e.dataTransfer.getData(BENCH_DRAG_MIME))
    const stage = stageRef.current
    if (!data || !stage) return
    e.preventDefault()
    stage.setPointersPositions(e.nativeEvent)
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const point = pxToMeters(pointer, scale)
    if (isInsidePitch(point, DROP_MARGIN)) dropPlayer(data.side, data.playerId, point)
  }

  return (
    <div ref={containerRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4">
      {scale > 0 && (
        <div
          className="relative overflow-hidden rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
          style={{ outline: benchOver ? '2px solid var(--color-accent)' : undefined }}
          onDragOver={(e) => {
            // Só aceita arrastos do banco; `preventDefault` é o que autoriza o drop no HTML5.
            if (!e.dataTransfer.types.includes(BENCH_DRAG_MIME)) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setBenchOver(true)
          }}
          onDragLeave={() => setBenchOver(false)}
          onDrop={handleBenchDrop}
        >
          <Stage
            ref={stageRef}
            width={stageWidth}
            height={stageHeight}
            onMouseDown={() => {
              // Desenhos e o ponto de controle cancelam o bubble; qualquer outro clique solta a seleção.
              const tools = useToolStore.getState()
              if (tools.tool === 'select' && tools.selectedId) tools.select(null)
            }}
          >
            {/* Camadas de baixo para cima: campo, desenhos, jogadores e captura das ferramentas de desenho. */}
            <Layer listening={false}>
              <PitchMarkings scale={scale} />
            </Layer>
            <ShapesLayer scale={scale} />
            <TokensLayer
              tokens={tokens}
              stacks={stacks}
              scale={scale}
              selecting={selecting}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onHover={setHovered}
            />
            <CaptureLayer scale={scale} />
          </Stage>
          <TextEditor scale={scale} />
          {hovered && !dragging && selecting ? (
            // HTML sobre o canvas: metros + RUNOFF, vezes a escala, dão a posição em pixels.
            <PlayerTooltip
              player={hovered.player}
              teamName={hovered.model.team?.name ?? ''}
              numberColor={hovered.model.color}
              left={(hovered.placement.x + RUNOFF) * scale}
              top={(hovered.placement.y + RUNOFF) * scale}
              stageWidth={stageWidth}
              stageHeight={stageHeight}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
