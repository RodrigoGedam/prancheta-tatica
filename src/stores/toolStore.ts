import { create } from 'zustand'
import { DRAW_COLORS, type ShapeStyle, type StrokeWidth } from '@/lib/geometry/shapes'

export type Tool = 'select' | 'free' | 'arrow' | 'curve' | 'rect' | 'ellipse' | 'text' | 'eraser'

/** Ferramentas na ordem da toolbar, com o atalho de teclado. */
export const TOOLS: readonly { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: 'Selecionar', key: 'V' },
  { id: 'free', label: 'Desenho livre', key: 'P' },
  { id: 'arrow', label: 'Flecha', key: 'A' },
  { id: 'curve', label: 'Flecha curva', key: 'C' },
  { id: 'rect', label: 'Retângulo', key: 'R' },
  { id: 'ellipse', label: 'Círculo', key: 'O' },
  { id: 'text', label: 'Texto', key: 'T' },
  { id: 'eraser', label: 'Borracha', key: 'E' },
]

/**
 * Estado de UI da ferramenta de desenho. Fica fora do boardStore de propósito:
 * trocar de ferramenta ou de cor não entra no histórico de desfazer (etapa 5).
 */
interface ToolState {
  tool: Tool
  style: ShapeStyle
  /** Desenho selecionado (ferramenta Selecionar). */
  selectedId: string | null
  /** Texto em edição (overlay HTML). */
  editingTextId: string | null
  setTool: (tool: Tool) => void
  setColor: (color: string) => void
  setWidth: (width: StrokeWidth) => void
  toggleDashed: () => void
  /** Com `style`, a toolbar passa a mostrar o estilo do desenho selecionado. */
  select: (id: string | null, style?: ShapeStyle) => void
  editText: (id: string | null) => void
}

export const useToolStore = create<ToolState>()((set) => ({
  tool: 'select',
  style: { color: DRAW_COLORS[0].hex, width: 'medium', dashed: false },
  selectedId: null,
  editingTextId: null,
  setTool: (tool) => set({ tool, selectedId: null }),
  setColor: (color) => set((s) => ({ style: { ...s.style, color } })),
  setWidth: (width) => set((s) => ({ style: { ...s.style, width } })),
  toggleDashed: () => set((s) => ({ style: { ...s.style, dashed: !s.style.dashed } })),
  select: (selectedId, style) => set((s) => ({ selectedId, style: style ? { ...style } : s.style })),
  editText: (editingTextId) => set({ editingTextId }),
}))
