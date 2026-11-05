import { useMemo, useRef, useState, type DragEvent } from 'react'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Group, Layer, Stage } from 'react-konva'
import { useElementSize } from '@/hooks/useElementSize'
import { stackInfo, tokenMark } from '@/lib/board/placement'
import { PITCH, RUNOFF, computeScale, isInsidePitch, pxToMeters, type Side } from '@/lib/geometry/pitch'
import { useBoardStore } from '@/stores/boardStore'
import { PitchMarkings } from './PitchMarkings'
import { PlayerToken } from './PlayerToken'
import { PlayerTooltip } from './PlayerTooltip'
import { BENCH_DRAG_MIME, benchSideAt, parseBenchDrag } from './benchDrag'
import { dropPlayer, type PlacedPlayer, type SideModel } from './useBoardModel'

/** Tolerância (m) para fora das linhas ainda contar como "no campo" ao soltar. */
const DROP_MARGIN = 1.5

interface TokenItem extends PlacedPlayer {
  side: Side
  model: SideModel
}

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

  const scale = computeScale(width, height)
  const stageWidth = Math.floor((PITCH.width + 2 * RUNOFF) * scale)
  const stageHeight = Math.floor((PITCH.length + 2 * RUNOFF) * scale)

  const tokens = useMemo(
    () =>
      sides
        .filter((m) => m.team && !m.state.hidden)
        .flatMap((m) => m.onPitch.map((p): TokenItem => ({ ...p, side: m.side, model: m })))
        .sort((a, b) => a.placement.z - b.placement.z),
    [sides],
  )
  const stacks = useMemo(
    () =>
      stackInfo(
        tokens.map((t) => ({ id: `${t.side}:${t.player.id}`, x: t.placement.x, y: t.placement.y, z: t.placement.z })),
      ),
    [tokens],
  )

  function handleDragEnd(item: TokenItem, e: KonvaEventObject<globalThis.DragEvent>) {
    setDragging(false)
    const node = e.target
    const point = { x: node.x(), y: node.y() }
    const evt = e.evt as unknown as MouseEvent
    const benchSide = benchSideAt(evt.clientX, evt.clientY)
    if (benchSide === item.side) {
      useBoardStore.getState().removePlayer(item.side, item.player.id)
      return
    }
    if (benchSide || !isInsidePitch(point, DROP_MARGIN)) {
      // Fora do campo e do banco (ou no banco do outro time): volta ao lugar.
      node.position({ x: item.placement.x, y: item.placement.y })
      return
    }
    // Alinha o nó ao destino: se x ou y não mudarem, o react-konva não reaplica a prop.
    node.position(dropPlayer(item.side, item.player.id, point))
  }

  function handleBenchDrop(e: DragEvent<HTMLDivElement>) {
    setBenchOver(false)
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
            if (!e.dataTransfer.types.includes(BENCH_DRAG_MIME)) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setBenchOver(true)
          }}
          onDragLeave={() => setBenchOver(false)}
          onDrop={handleBenchDrop}
        >
          <Stage ref={stageRef} width={stageWidth} height={stageHeight}>
            <Layer listening={false}>
              <PitchMarkings scale={scale} />
            </Layer>
            <Layer>
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
                      draggable
                      onDragStart={() => {
                        setDragging(true)
                        setHovered(null)
                      }}
                      onDragEnd={(e) => handleDragEnd(t, e)}
                      onHover={(on) => setHovered(on ? t : null)}
                    />
                  )
                })}
              </Group>
            </Layer>
          </Stage>
          {hovered && !dragging ? (
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
