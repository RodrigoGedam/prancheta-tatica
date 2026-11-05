import { useEffect } from 'react'
import { useBoardStore } from '@/stores/boardStore'
import { TOOLS, useToolStore } from '@/stores/toolStore'

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
 * Delete/Backspace (apagar o desenho selecionado). Ctrl+Z/Ctrl+Y chegam na etapa 5.
 */
export function useDrawShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || shouldIgnore(e)) return
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
        tools.toggleDashed()
        const dashed = useToolStore.getState().style.dashed
        const board = useBoardStore.getState()
        const shape = board.shapes.find((s) => s.id === tools.selectedId)
        if (shape) board.updateShape({ ...shape, style: { ...shape.style, dashed } })
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
