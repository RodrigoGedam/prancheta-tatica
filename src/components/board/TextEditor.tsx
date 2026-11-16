import { useEffect, useRef, useState } from 'react'
import { RUNOFF } from '@/lib/geometry/pitch'
import type { TextShape } from '@/lib/geometry/shapes'
import { endHistoryBatch, useBoardStore } from '@/stores/boardStore'
import { useToolStore } from '@/stores/toolStore'

/**
 * Edita um texto do desenho num textarea HTML posicionado sobre o canvas (texto no canvas não é editável).
 * Enter confirma (Shift+Enter quebra linha), Esc cancela; texto vazio é apagado.
 * A edição roda dentro de um lote de histórico, aberto por quem iniciou a edição e fechado aqui.
 */
export function TextEditor({ scale }: { scale: number }) {
  const editingId = useToolStore((s) => s.editingTextId)
  const shape = useBoardStore((s) => s.shapes.find((x): x is TextShape => x.id === editingId && x.type === 'text'))
  if (!shape) return null
  // `key` pelo id: editar outro texto monta um TextArea novo, com o valor inicial daquele texto.
  return <TextArea key={shape.id} shape={shape} scale={scale} />
}

function TextArea({ shape, scale }: { shape: TextShape; scale: number }) {
  const [value, setValue] = useState(shape.text)
  const ref = useRef<HTMLTextAreaElement>(null)
  // Garante um só fim: depois de Enter ou Esc, um blur que venha em seguida não repete o fim.
  const done = useRef(false)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  function finish(commit: boolean) {
    if (done.current) return
    done.current = true
    const board = useBoardStore.getState()
    const text = commit ? value : shape.text
    if (text.trim() === '') board.removeShape(shape.id)
    else if (text !== shape.text) board.updateShape({ ...shape, text })
    useToolStore.getState().editText(null)
    endHistoryBatch()
  }

  // Tamanho estimado pelo número de caracteres e linhas (0,6 da fonte por caractere; 1,2 de altura de linha).
  const fontPx = shape.fontSize * scale
  const lines = Math.max(1, value.split('\n').length)
  const longest = Math.max(4, ...value.split('\n').map((l) => l.length))

  return (
    <textarea
      ref={ref}
      aria-label="Texto do desenho"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        // As teclas ficam no textarea: não disparam atalhos (V, Ctrl+Z...) nem o Esc da CaptureLayer.
        e.stopPropagation()
        if (e.key === 'Escape') finish(false)
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          finish(true)
        }
      }}
      className="absolute z-20 m-0 resize-none overflow-hidden rounded border border-accent/80 bg-black/40 p-0 leading-[1.2] font-bold outline-none"
      // Metros + RUNOFF, vezes a escala, dão a posição em pixels sobre o Stage.
      style={{
        left: (shape.x + RUNOFF) * scale - 2,
        top: (shape.y + RUNOFF) * scale - 2,
        fontSize: fontPx,
        fontFamily: '"Barlow Condensed", Barlow, sans-serif',
        color: shape.style.color,
        width: longest * fontPx * 0.6 + 12,
        height: lines * fontPx * 1.2 + 4,
      }}
    />
  )
}
