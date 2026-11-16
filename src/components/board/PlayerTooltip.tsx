import { lighten } from '@/lib/colors'
import type { PlayerRow } from '@/lib/supabase/schemas'

/** Largura do tooltip e distância do centro do token, em px. */
const WIDTH = 176
const OFFSET = 26

interface PlayerTooltipProps {
  player: PlayerRow
  teamName: string
  numberColor: string
  /** Centro do token, em px do Stage. */
  left: number
  top: number
  stageWidth: number
  stageHeight: number
}

/** Tooltip HTML sobre o canvas: abre ao lado do token, virando quando encosta na borda. */
export function PlayerTooltip({ player, teamName, numberColor, left, top, stageWidth, stageHeight }: PlayerTooltipProps) {
  const flipX = left + OFFSET + WIDTH > stageWidth
  const x = flipX ? left - OFFSET - WIDTH : left + OFFSET
  // Um pouco acima do token, sem sair do Stage (8 px de margem em cima, ~90 px de altura do tooltip embaixo).
  const y = Math.min(Math.max(top - 30, 8), stageHeight - 90)
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 box-border flex flex-col gap-1 rounded-[10px] border border-line-strong bg-ground px-3 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
      style={{ left: x, top: y, width: WIDTH }}
    >
      <div className="flex items-center gap-2">
        {player.number !== null ? (
          <span className="font-display text-lg font-bold" style={{ color: lighten(numberColor) }}>
            #{player.number}
          </span>
        ) : null}
        <span className="truncate text-sm font-semibold">{player.nickname ?? player.name}</span>
      </div>
      {player.nickname ? <span className="text-xs text-ink-soft">{player.name}</span> : null}
      <span className="text-[11px] text-muted">
        {player.position} · {teamName} · {player.is_starter ? 'titular' : 'reserva'}
      </span>
    </div>
  )
}
