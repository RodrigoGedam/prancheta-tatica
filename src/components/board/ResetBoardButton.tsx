import { useState } from 'react'
import { RotateCcwIcon } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useTeams } from '@/hooks/useTeamData'
import { useBoardStore } from '@/stores/boardStore'
import { restartBoard, restoreBoard } from './boardReset'

const optionClass =
  'flex cursor-pointer flex-col gap-0.5 rounded-lg border border-line-strong bg-control px-3 py-2.5 text-left text-ink outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus/70 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-control'

/** Botão do cabeçalho: voltar ao início (mantém os times) ou reiniciar tudo. Os dois podem ser desfeitos. */
export function ResetBoardButton() {
  const [open, setOpen] = useState(false)
  const teams = useTeams()
  const hasContent = useBoardStore((s) => Boolean(s.sides.home.teamId || s.sides.away.teamId || s.shapes.length > 0))
  const run = (action: () => void) => {
    action()
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong bg-control px-2.5 text-sm text-ink outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus/70"
        >
          <RotateCcwIcon size={15} aria-hidden="true" />
          Resetar
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 flex w-80 flex-col gap-2.5 rounded-xl border border-line-strong bg-surface p-4 text-ink shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
        >
          <span className="font-semibold">Resetar prancheta</span>
          <button
            type="button"
            className={optionClass}
            // A formação padrão vem da lista de times: sem ela, o reset montaria a formação errada.
            disabled={!teams.isSuccess || !hasContent}
            onClick={() => run(() => restoreBoard(teams.data ?? []))}
          >
            <span className="text-sm font-semibold">Voltar ao início</span>
            <span className="text-xs text-muted">
              Mantém os times. Titulares e formação padrão voltam, as cores voltam às originais e os desenhos são apagados.
            </span>
          </button>
          <button type="button" className={optionClass} onClick={() => run(restartBoard)}>
            <span className="text-sm font-semibold">Reiniciar tudo</span>
            <span className="text-xs text-muted">Tira também os times escolhidos e começa do zero.</span>
          </button>
          <p className="m-0 text-xs text-muted">Dá para desfazer com Ctrl+Z.</p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
