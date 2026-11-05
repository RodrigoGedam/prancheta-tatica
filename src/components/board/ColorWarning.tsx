import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { areColorsSimilar, pickAlternativeColor } from '@/lib/colors'
import { ALTERNATIVES, ColorOptions, applyBoardColor } from './boardColors'
import type { SideModel } from './useBoardModel'

/**
 * Pop-up de cores parecidas (não mexe no layout do campo). Abre sozinho quando as cores efetivas
 * na prancheta se confundem; depois de fechado, só reabre se o par de times ou de cores mudar.
 */
export function ColorWarning({ home, away }: { home: SideModel; away: SideModel }) {
  const [dismissed, setDismissed] = useState<string | null>(null)
  const key = `${home.state.teamId}|${away.state.teamId}|${home.color}|${away.color}`
  const open = Boolean(home.team && away.team) && areColorsSimilar(home.color, away.color) && dismissed !== key
  const suggestion = pickAlternativeColor(
    home.color,
    ALTERNATIVES.filter((c) => !areColorsSimilar(c, away.color)),
  )

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setDismissed(key)}>
      {open ? (
        <DialogContent
          title="Cores parecidas"
          description={
            <>
              <strong>{home.team?.name}</strong> e <strong>{away.team?.name}</strong> estão com cores parecidas na
              prancheta. Escolha outra cor para um dos times (vale só nesta prancheta).
            </>
          }
          footer={
            <Button variant="secondary" onClick={() => setDismissed(key)}>
              Manter assim
            </Button>
          }
        >
          <span className="text-sm text-muted">
            Cor do visitante ({away.team?.name}){suggestion ? ' · sugestão destacada' : ''}
          </span>
          <ColorOptions
            colors={ALTERNATIVES}
            value={away.color}
            suggestion={suggestion}
            onChoose={(hex) => {
              setDismissed(key)
              applyBoardColor(away, hex)
            }}
          />
          <span className="text-xs text-muted">Também dá para trocar a cor clicando na bolinha ao lado do time, no topo.</span>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
