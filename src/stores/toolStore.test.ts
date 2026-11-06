import { beforeEach, describe, expect, it } from 'vitest'
import { useToolStore } from './toolStore'

const initial = useToolStore.getState()

describe('toolStore', () => {
  beforeEach(() => useToolStore.setState(initial, true))

  it('selecionar um desenho traz o estilo dele para a toolbar', () => {
    const style = { color: '#EF4444', width: 'thick', dashed: true } as const
    useToolStore.getState().select('a', style)
    const s = useToolStore.getState()
    expect(s.selectedId).toBe('a')
    expect(s.style).toEqual(style)
    s.toggleDashed()
    expect(useToolStore.getState().style.dashed).toBe(false)
  })

  it('soltar a seleção mantém o estilo atual', () => {
    useToolStore.getState().setColor('#38BDF8')
    useToolStore.getState().select(null)
    expect(useToolStore.getState().style.color).toBe('#38BDF8')
  })

  it('trocar de ferramenta solta a seleção', () => {
    useToolStore.getState().select('a')
    useToolStore.getState().setTool('arrow')
    expect(useToolStore.getState().selectedId).toBeNull()
  })

  it('resetTools volta à ferramenta e ao estilo de quando a página abre', () => {
    const tools = useToolStore.getState()
    tools.setTool('arrow')
    tools.setColor('#EF4444')
    tools.setWidth('thick')
    tools.toggleDashed()
    tools.select('a')
    tools.editText('b')
    tools.resetTools()
    const { tool, style, selectedId, editingTextId } = useToolStore.getState()
    expect({ tool, style, selectedId, editingTextId }).toEqual({
      tool: initial.tool,
      style: initial.style,
      selectedId: null,
      editingTextId: null,
    })
  })
})
