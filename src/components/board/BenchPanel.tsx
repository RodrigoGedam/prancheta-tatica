import { useState } from 'react'
import { BookmarkPlusIcon, EyeIcon, EyeOffIcon, RotateCcwIcon } from 'lucide-react'
import { tokenMark } from '@/lib/board/placement'
import { textColorOn } from '@/lib/colors'
import { cn } from '@/lib/utils'
import { useBoardStore } from '@/stores/boardStore'
import { BENCH_DRAG_MIME, serializeBenchDrag } from './benchDrag'
import { SaveFormationDialog } from './SaveFormationDialog'
import { SIDE_LABEL, useSideActions, type SideModel } from './useBoardModel'

export function BenchPanel({ sides }: { sides: readonly SideModel[] }) {
  return (
    <aside
      aria-label="Bancos de reservas"
      className="flex w-[340px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-surface p-4"
    >
      {sides.map((m) => (
        <BenchSection key={m.side} model={m} />
      ))}
      <p className="m-0 text-xs leading-normal text-muted">
        Arraste do banco para o campo. Soltar sobre outro jogador empilha; soltar fora volta ao lugar; soltar no banco
        tira do campo.
      </p>
    </aside>
  )
}

const iconButton =
  'flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line-strong bg-control p-0 text-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40'

function BenchSection({ model }: { model: SideModel }) {
  const { side, team, bench, state } = model
  const actions = useSideActions(model)
  const toggleHidden = useBoardStore((s) => s.toggleHidden)
  const [saving, setSaving] = useState(false)

  return (
    <section
      data-bench-side={side}
      aria-label={`Banco do ${SIDE_LABEL[side].toLowerCase()}`}
      className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface-2 p-3.5"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: team ? model.color : '#3a4652' }} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-[19px] leading-tight font-bold">{team?.name ?? 'Sem time'}</span>
          <span className="text-xs text-muted">
            {SIDE_LABEL[side]}
            {team ? ` · banco (${bench.length})` : ''}
            {state.hidden ? ' · escondido' : ''}
          </span>
        </div>
        <button
          type="button"
          className={iconButton}
          aria-label="Salvar posições como formação"
          title="Salvar como formação"
          disabled={!team}
          onClick={() => setSaving(true)}
        >
          <BookmarkPlusIcon size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(iconButton, state.hidden && 'border-accent text-accent')}
          aria-label={state.hidden ? 'Mostrar time' : 'Esconder time'}
          aria-pressed={state.hidden}
          title={state.hidden ? 'Mostrar' : 'Esconder'}
          disabled={!team}
          onClick={() => toggleHidden(side)}
        >
          {state.hidden ? <EyeIcon size={17} aria-hidden="true" /> : <EyeOffIcon size={17} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Resetar time"
          title="Resetar"
          disabled={!team || !model.playersLoaded}
          onClick={actions.reset}
        >
          <RotateCcwIcon size={17} aria-hidden="true" />
        </button>
      </div>

      {!team ? (
        <p className="m-0 text-sm text-muted">Escolha o {SIDE_LABEL[side].toLowerCase()} no topo.</p>
      ) : state.hidden ? null : !model.playersLoaded ? (
        <p className="m-0 text-sm text-muted">Carregando elenco…</p>
      ) : bench.length === 0 ? (
        <p className="m-0 text-sm text-muted">Todos os jogadores estão em campo.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {bench.map((p) => {
            const fill = p.position === 'GOL' ? model.goalkeeperColor : model.color
            return (
              <li
                key={p.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(BENCH_DRAG_MIME, serializeBenchDrag(side, p.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                title={`${p.name} · ${p.position}`}
                className="flex cursor-grab items-center gap-2.5 rounded-lg bg-[#1f2730] px-2 py-1.5 active:cursor-grabbing"
              >
                <span
                  aria-hidden="true"
                  className="box-border flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-white/85 font-display text-[13px] font-bold"
                  style={{ background: fill, color: textColorOn(fill) }}
                >
                  {tokenMark(p)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nickname ?? p.name}</span>
                <span className="rounded bg-[#2a343e] px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                  {p.position}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <SaveFormationDialog open={saving} onOpenChange={setSaving} model={model} />
    </section>
  )
}
