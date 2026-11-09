import { useState } from 'react'
import { Popover } from 'radix-ui'
import { TEAM_COLORS } from '@/components/teams/shared'
import { cn } from '@/lib/utils'
import { useBoardStore } from '@/stores/boardStore'
import { SIDE_LABEL, type SideModel } from './useBoardModel'

/** Cores oferecidas na prancheta (as do cadastro de time + algumas extras). */
export const ALTERNATIVES: readonly string[] = [
  ...TEAM_COLORS.map((c) => c.hex),
  '#0EA5E9',
  '#DB2777',
  '#CA8A04',
  '#0F766E',
]

const same = (a: string, b: string | undefined) => a.toUpperCase() === b?.toUpperCase()

/** Aplica a cor só na prancheta; escolher a cor original limpa a alternativa. Nunca grava no Supabase. */
export function applyBoardColor(model: SideModel, hex: string | null) {
  useBoardStore.getState().setColorOverride(model.side, hex === null || same(hex, model.team?.color) ? null : hex)
}

interface ColorOptionsProps {
  colors: readonly string[]
  value: string
  onChoose: (hex: string) => void
  suggestion?: string | null
}

export function ColorOptions({ colors, value, onChoose, suggestion }: ColorOptionsProps) {
  return (
    <div role="radiogroup" aria-label="Cor na prancheta" className="flex flex-wrap gap-2">
      {colors.map((hex) => {
        const selected = same(hex, value)
        const suggested = hex === suggestion
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Cor ${hex}${suggested ? ' (sugestão)' : ''}`}
            title={suggested ? `${hex} (sugestão)` : hex}
            onClick={() => onChoose(hex)}
            className={cn(
              'size-7 cursor-pointer rounded-full border-[3px] p-0 outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
              selected ? 'border-accent' : 'border-surface',
            )}
            style={{ background: hex, boxShadow: suggested ? '0 0 0 2px var(--color-accent)' : '0 0 0 1px var(--color-edge)' }}
          />
        )
      })}
    </div>
  )
}

/** Bolinha de cor do lado, no cabeçalho; abre a paleta da prancheta. */
export function BoardColorButton({ model }: { model: SideModel }) {
  const [open, setOpen] = useState(false)
  const label = `Cor do ${SIDE_LABEL[model.side].toLowerCase()} na prancheta`
  const choose = (hex: string | null) => {
    applyBoardColor(model, hex)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={!model.team}
          aria-label={label}
          title={label}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 outline-none hover:bg-control focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-default disabled:hover:bg-transparent"
        >
          <span
            aria-hidden="true"
            className="size-3 rounded-full ring-1 ring-white/40"
            style={{ background: model.team ? model.color : 'var(--color-edge)' }}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="start"
          className="z-50 flex w-72 flex-col gap-3 rounded-xl border border-line-strong bg-surface p-4 text-ink shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
        >
          <span className="font-semibold">Cor na prancheta</span>
          <ColorOptions colors={ALTERNATIVES} value={model.color} onChoose={choose} />
          <button
            type="button"
            onClick={() => choose(null)}
            className="flex cursor-pointer items-center gap-2 self-start rounded-md border-0 bg-transparent p-1 text-sm text-ink hover:bg-control"
          >
            <span
              aria-hidden="true"
              className="size-4 rounded-full border border-line-strong"
              style={{ background: model.team?.color }}
            />
            Cor original
          </button>
          <p className="m-0 text-xs text-muted">Vale só nesta prancheta; a cor do time não muda.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
