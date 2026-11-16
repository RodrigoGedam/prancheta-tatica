// Atalhos de teclado da prancheta e as ações de estilo e desfazer que a toolbar também usa.
import { useEffect } from 'react'
import type { ShapeStyle } from '@/lib/geometry/shapes'
import { redo, undo, useBoardStore } from '@/stores/boardStore'
import { TOOLS, useToolStore } from '@/stores/toolStore'

/** Se houver um desenho selecionado, aplica o estilo nele também. */
export function applyStyleToSelection(patch: Partial<ShapeStyle>) {
  const { selectedId } = useToolStore.getState()
  const board = useBoardStore.getState()
  const shape = selectedId ? board.shapes.find((s) => s.id === selectedId) : undefined
  if (shape) board.updateShape({ ...shape, style: { ...shape.style, ...patch } })
}

/** Liga/desliga o tracejado do estilo atual e do desenho selecionado. */
export function toggleDashedStyle() {
  useToolStore.getState().toggleDashed()
  applyStyleToSelection({ dashed: useToolStore.getState().style.dashed })
}

/**
 * Desfaz/refaz e ajusta a seleção (some se o desenho deixou de existir; senão a toolbar mostra o estilo dele).
 * São os pontos de entrada da interface: chamar `undo()` direto pula esse ajuste.
 */
export function undoBoard() {
  undo()
  dropMissingSelection()
}

export function redoBoard() {
  redo()
  dropMissingSelection()
}

function dropMissingSelection() {
  const tools = useToolStore.getState()
  const ids = new Set(useBoardStore.getState().shapes.map((s) => s.id))
  const selected = useBoardStore.getState().shapes.find((s) => s.id === tools.selectedId)
  // O desenho pode ter voltado com outro estilo: a toolbar acompanha.
  if (tools.selectedId) tools.select(selected ? selected.id : null, selected?.style)
  if (tools.editingTextId && !ids.has(tools.editingTextId)) tools.editText(null)
}

/** Não roubar teclas de campos de texto nem de diálogos abertos. */
function shouldIgnore(e: KeyboardEvent): boolean {
  const target = e.target
  if (target instanceof HTMLElement) {
    if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  }
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

/**
 * Atalhos da prancheta: V P A C R O T E (ferramentas), D (tracejado), Esc (soltar seleção / voltar ao Selecionar),
 * Delete/Backspace (apagar o desenho selecionado), Ctrl+Z (desfazer), Ctrl+Y ou Ctrl+Shift+Z (refazer).
 */
export function useDrawShortcuts() {
  // Registrado uma vez; o handler lê os stores com getState(), então sempre vê o estado atual.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || shouldIgnore(e)) return
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase()
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault()
          undoBoard()
        } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
          e.preventDefault()
          redoBoard()
        }
        return
      }
      const tools = useToolStore.getState()
      const key = e.key.toUpperCase()

      const tool = TOOLS.find((t) => t.key === key)
      if (tool) {
        e.preventDefault()
        tools.setTool(tool.id)
        return
      }
      if (key === 'D') {
        e.preventDefault()
        toggleDashedStyle()
        return
      }
      if (e.key === 'Escape') {
        if (tools.selectedId) tools.select(null)
        else if (tools.tool !== 'select') tools.setTool('select')
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && tools.selectedId) {
        e.preventDefault()
        useBoardStore.getState().removeShape(tools.selectedId)
        tools.select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
