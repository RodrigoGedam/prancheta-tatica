import { Redo2Icon, Trash2Icon, Undo2Icon } from 'lucide-react'
import { DRAW_COLORS, type StrokeWidth } from '@/lib/geometry/shapes'
import { cn } from '@/lib/utils'
import { useStore } from 'zustand'
import { useBoardStore } from '@/stores/boardStore'
import { TOOLS, useToolStore, type Tool } from '@/stores/toolStore'
import { clearDrawings } from './boardReset'
import { redoBoard, undoBoard } from './useDrawShortcuts'

/** Ícones do mockup (traço 2, viewBox 24). */
const TOOL_ICON: Record<Tool, string> = {
  select: 'M5 3l14 8-6 1.5L10 19z',
  free: 'M3 17c3-6 6-8 8-4s5 2 7-6',
  arrow: 'M5 19L19 5M10 5h9v9',
  curve: 'M4 19C6 9 12 5 19 6M14 3l5 3-3 5',
  rect: 'M4 6h16v12H4z',
  ellipse: 'M20 12a8 8 0 1 1-16 0a8 8 0 1 1 16 0',
  text: 'M5 7V4h14v3M12 4v16M9 20h6',
  eraser: 'M8 20h12M4 15l9-9 6 6-7 7H8z',
}

const WIDTHS: readonly { id: StrokeWidth; label: string; px: number }[] = [
  { id: 'thin', label: 'Fina', px: 2 },
  { id: 'medium', label: 'Média', px: 4 },
  { id: 'thick', label: 'Grossa', px: 6 },
]

const historyButton =
  'flex size-11 cursor-pointer items-center justify-center rounded-[10px] border border-transparent bg-transparent p-0 text-ink-soft outline-none hover:bg-control hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/70 disabled:cursor-default disabled:bg-transparent disabled:text-faint'

/** Muda o estilo da ferramenta e, se houver um desenho selecionado, aplica nele também. */
function applyStyle(patch: Partial<ReturnType<typeof useToolStore.getState>['style']>) {
  const { selectedId } = useToolStore.getState()
  const board = useBoardStore.getState()
  const shape = selectedId ? board.shapes.find((s) => s.id === selectedId) : undefined
  if (shape) board.updateShape({ ...shape, style: { ...shape.style, ...patch } })
}

export function DrawToolbar() {
  const tool = useToolStore((s) => s.tool)
  const style = useToolStore((s) => s.style)
  const { setTool, setColor, setWidth, toggleDashed } = useToolStore.getState()
  const canUndo = useStore(useBoardStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useBoardStore.temporal, (s) => s.futureStates.length > 0)
  const hasShapes = useBoardStore((s) => s.shapes.length > 0)

  return (
    <aside
      aria-label="Ferramentas de desenho"
      className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-r border-line bg-surface py-3.5"
    >
      <div role="radiogroup" aria-label="Ferramenta" className="flex flex-col gap-1.5">
        {TOOLS.map((t) => {
          const active = t.id === tool
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${t.label} (${t.key})`}
              title={`${t.label} (${t.key})`}
              onClick={() => setTool(t.id)}
              className={cn(
                'relative flex size-11 cursor-pointer items-center justify-center rounded-[10px] border p-0 outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                active ? 'border-accent bg-action text-on-accent' : 'border-line-strong bg-control text-ink hover:bg-surface-2',
              )}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={TOOL_ICON[t.id]} />
              </svg>
              <span aria-hidden="true" className="absolute right-[3px] bottom-px text-[9px] font-semibold opacity-70">
                {t.key}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!hasShapes}
        onClick={clearDrawings}
        aria-label="Apagar todos os desenhos"
        title="Apagar todos os desenhos"
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-line-strong bg-control p-0 text-ink outline-none hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus/70 disabled:cursor-default disabled:text-faint disabled:hover:bg-control"
      >
        <Trash2Icon size={20} aria-hidden="true" />
      </button>

      <div aria-hidden="true" className="my-1.5 h-px w-9 bg-chip" />

      <button
        type="button"
        aria-pressed={style.dashed}
        aria-label="Tracejado (D)"
        title="Tracejado (D)"
        onClick={() => {
          toggleDashed()
          applyStyle({ dashed: useToolStore.getState().style.dashed })
        }}
        className={cn(
          'flex size-11 cursor-pointer items-center justify-center rounded-[10px] border bg-control p-0 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
          style.dashed ? 'border-accent text-accent' : 'border-line-strong',
        )}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M3 12h3M10 12h4M18 12h3" />
        </svg>
      </button>

      <div role="radiogroup" aria-label="Cor do desenho" className="mt-1 grid grid-cols-2 gap-1.5">
        {DRAW_COLORS.map((c) => {
          const active = c.hex === style.color
          return (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={c.label}
              title={c.label}
              onClick={() => {
                setColor(c.hex)
                applyStyle({ color: c.hex })
              }}
              className={cn(
                'size-5 cursor-pointer rounded-full border-2 p-0 shadow-[inset_0_0_0_1px_var(--color-ground)] outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                active ? 'border-accent' : 'border-line-strong',
              )}
              style={{ background: c.hex }}
            />
          )
        })}
      </div>

      <div role="radiogroup" aria-label="Espessura" className="mt-2 flex flex-col gap-1">
        {WIDTHS.map((w) => {
          const active = w.id === style.width
          return (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Espessura ${w.label.toLowerCase()}`}
              title={`Espessura ${w.label.toLowerCase()}`}
              onClick={() => {
                setWidth(w.id)
                applyStyle({ width: w.id })
              }}
              className={cn(
                'flex h-[22px] w-11 cursor-pointer items-center justify-center rounded-md border bg-control p-0 outline-none focus-visible:ring-2 focus-visible:ring-focus/70',
                active ? 'border-accent' : 'border-line-strong',
              )}
            >
              <span aria-hidden="true" className="block w-6 rounded bg-ink" style={{ height: w.px }} />
            </button>
          )
        })}
      </div>

      <div className="flex-1" />
      <button
        type="button"
        disabled={!canUndo}
        onClick={undoBoard}
        aria-label="Desfazer (Ctrl+Z)"
        title="Desfazer (Ctrl+Z)"
        className={historyButton}
      >
        <Undo2Icon size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        disabled={!canRedo}
        onClick={redoBoard}
        aria-label="Refazer (Ctrl+Y)"
        title="Refazer (Ctrl+Y)"
        className={historyButton}
      >
        <Redo2Icon size={20} aria-hidden="true" />
      </button>
    </aside>
  )
}
