import type { ReactNode } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import { TEAM_COLORS } from '@/components/teams/shared'
import { areColorsSimilar, pickAlternativeColor } from '@/lib/colors'
import { useBoardStore } from '@/stores/boardStore'
import type { SideModel } from './useBoardModel'

const ALTERNATIVES = [...TEAM_COLORS.map((c) => c.hex), '#0EA5E9', '#DB2777', '#CA8A04', '#0F766E']

/** Faixa acima do campo quando as cores dos dois times se confundem. A alternativa vale só na prancheta. */
export function ColorWarning({ home, away }: { home: SideModel; away: SideModel }) {
  const setColorOverride = useBoardStore((s) => s.setColorOverride)
  // Com a cor alternativa aplicada, a faixa some (pedido do Rodrigo: não ocupar espaço).
  // A cor original volta ao trocar o time do visitante.
  if (!home.team || !away.team || away.state.colorOverride) return null

  if (!areColorsSimilar(home.team.color, away.team.color)) return null
  const alternative = pickAlternativeColor(
    home.team.color,
    ALTERNATIVES.filter((c) => !areColorsSimilar(c, away.team?.color ?? c)),
  )

  return (
    <Strip>
      <TriangleAlertIcon size={18} className="shrink-0 text-warning" aria-hidden="true" />
      <span className="flex-1">
        Cores parecidas: <strong>{home.team.name}</strong> e <strong>{away.team.name}</strong>.
      </span>
      {alternative ? (
        <StripButton onClick={() => setColorOverride('away', alternative)}>
          <span aria-hidden="true" className="size-3.5 rounded-full border border-white/80" style={{ background: alternative }} />
          Usar esta cor no visitante
        </StripButton>
      ) : null}
    </Strip>
  )
}

function Strip({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="mx-4 mt-4 flex items-center gap-3 rounded-[10px] border border-[#5c4a16] bg-[#2a2312] px-3.5 py-2 text-sm text-[#f5e6b0]"
    >
      {children}
    </div>
  )
}

function StripButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-[#5c4a16] bg-[#3a3018] px-3 text-[13px] font-semibold text-ink hover:bg-[#46391c]"
    >
      {children}
    </button>
  )
}
