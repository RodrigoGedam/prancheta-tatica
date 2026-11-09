import { z } from 'zod'
import { create } from 'zustand'
import type { Side } from '@/lib/geometry/pitch'

/** Tipo do dataTransfer ao arrastar um jogador do banco (HTML) para o campo (canvas). */
export const BENCH_DRAG_MIME = 'application/x-prancheta-tatica-player'

const benchDragSchema = z.object({ side: z.enum(['home', 'away']), playerId: z.string().min(1) })

export function serializeBenchDrag(side: Side, playerId: string): string {
  return JSON.stringify({ side, playerId })
}

export function parseBenchDrag(raw: string): { side: Side; playerId: string } | null {
  try {
    const parsed = benchDragSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/** Banco que vai receber o jogador arrastado no campo, se for solto agora (para destacar o banco). */
export const useBenchDropStore = create<{ target: Side | null; setTarget: (target: Side | null) => void }>()((set) => ({
  target: null,
  setTarget: (target) => set((s) => (s.target === target ? s : { target })),
}))

/** Qual banco (marcado com `data-bench-side`) está sob o ponteiro, se algum. */
export function benchSideAt(clientX: number, clientY: number): Side | null {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    const side = el instanceof HTMLElement ? el.closest<HTMLElement>('[data-bench-side]')?.dataset.benchSide : undefined
    if (side === 'home' || side === 'away') return side
  }
  return null
}
