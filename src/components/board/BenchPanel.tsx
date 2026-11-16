import { useState } from 'react'
import { ArrowDownToLineIcon, BookmarkPlusIcon, EyeIcon, EyeOffIcon, RotateCcwIcon } from 'lucide-react'
import { tokenMark } from '@/lib/board/placement'
import { textColorOn } from '@/lib/colors'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useBoardStore } from '@/stores/boardStore'
import { useToolStore } from '@/stores/toolStore'
import { BENCH_DRAG_MIME, serializeBenchDrag, useBenchDropStore } from './benchDrag'
import { SaveFormationDialog } from './SaveFormationDialog'
import { SIDE_LABEL, useSideActions, type SideModel } from './useBoardModel'

/** Painel lateral (HTML) com os bancos de reservas dos dois times e os botões de cada lado. */
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
  // Jogadores só se movem com a ferramenta Selecionar (spec §6).
  const selecting = useToolStore((s) => s.tool === 'select')
  const { side, team } = model
  // Um token do próprio time está sendo arrastado sobre este banco: mostra o destaque de "solte aqui".
  const dropping = useBenchDropStore((s) => s.target === side) && team !== undefined
  const { bench } = model
  const actions = useSideActions(model)
  const toggleHidden = useBoardStore((s) => s.toggleHidden)
  const signedIn = useAuthStore((s) => s.user !== null)
  const [saving, setSaving] = useState(false)

  return (
    // `data-bench-side` é a marca que benchSideAt procura para saber se um token foi solto sobre este banco.
    <section
      data-bench-side={side}
      aria-label={`Banco do ${SIDE_LABEL[side].toLowerCase()}`}
      className={cn(
        'relative flex flex-col gap-2.5 rounded-xl border bg-surface-2 p-3.5 transition-colors',
        dropping ? 'border-accent ring-2 ring-accent/40' : 'border-line',
      )}
    >
      {dropping ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-ground/80 text-accent"
        >
          <ArrowDownToLineIcon size={26} />
          <span className="font-display text-lg font-bold">Solte para voltar ao banco</span>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: team ? model.color : 'var(--color-edge)' }} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-[19px] leading-tight font-bold">{team?.name ?? 'Sem time'}</span>
          <span className="text-xs text-muted">
            {SIDE_LABEL[side]}
            {team ? ` · banco (${bench.length})` : ''}
            {model.hidden ? ' · escondido' : ''}
          </span>
        </div>
        <button
          type="button"
          className={iconButton}
          aria-label="Salvar posições como formação"
          title={signedIn ? 'Salvar como formação' : 'Entre na sua conta para salvar formações'}
          disabled={!team || !signedIn}
          onClick={() => setSaving(true)}
        >
          <BookmarkPlusIcon size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={cn(iconButton, model.hidden && 'border-accent text-accent')}
          aria-label={model.hidden ? 'Mostrar time' : 'Esconder time'}
          aria-pressed={model.hidden}
          title={model.hidden ? 'Mostrar' : 'Esconder'}
          disabled={!team}
          onClick={() => toggleHidden(side)}
        >
          {model.hidden ? <EyeIcon size={17} aria-hidden="true" /> : <EyeOffIcon size={17} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Resetar time"
          title="Resetar"
          disabled={!team || !model.playersLoaded || model.formationPending}
          onClick={actions.reset}
        >
          <RotateCcwIcon size={17} aria-hidden="true" />
        </button>
      </div>

      {!team ? (
        <p className="m-0 text-sm text-muted">Escolha o {SIDE_LABEL[side].toLowerCase()} no topo.</p>
      ) : model.hidden ? null : !model.playersLoaded ? (
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
                draggable={selecting}
                onDragStart={(e) => {
                  // Drag and drop do HTML5: a carga vai no dataTransfer e o drop é tratado em Board.tsx.
                  e.dataTransfer.setData(BENCH_DRAG_MIME, serializeBenchDrag(side, p.id))
                  e.dataTransfer.effectAllowed = 'move'
                }}
                title={`${p.name} · ${p.position}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg bg-control px-2 py-1.5',
                  selecting && 'cursor-grab active:cursor-grabbing',
                )}
              >
                <span
                  aria-hidden="true"
                  className="box-border flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-white/85 font-display text-[13px] font-bold"
                  style={{ background: fill, color: textColorOn(fill) }}
                >
                  {tokenMark(p)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nickname ?? p.name}</span>
                <span className="rounded bg-chip px-1.5 py-0.5 text-[11px] font-semibold text-accent">
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
