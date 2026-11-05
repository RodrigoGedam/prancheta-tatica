import { Layer, Stage } from 'react-konva'
import { useElementSize } from '@/hooks/useElementSize'
import { PITCH, RUNOFF, computeScale } from '@/lib/geometry/pitch'
import { PitchMarkings } from './PitchMarkings'

/**
 * Prancheta: o Stage tem exatamente o tamanho do campo + runoff, centralizado no container.
 * Tudo dentro do Stage é desenhado em METROS, dentro de um Group escalado (ver PitchMarkings).
 */
export function Board() {
  const [containerRef, { width, height }] = useElementSize<HTMLDivElement>()
  const scale = computeScale(width, height)
  const stageWidth = Math.floor((PITCH.width + 2 * RUNOFF) * scale)
  const stageHeight = Math.floor((PITCH.length + 2 * RUNOFF) * scale)

  return (
    <div ref={containerRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4">
      {scale > 0 && (
        <div className="overflow-hidden rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
          <Stage width={stageWidth} height={stageHeight}>
            <Layer listening={false}>
              <PitchMarkings scale={scale} />
            </Layer>
          </Stage>
        </div>
      )}
    </div>
  )
}
