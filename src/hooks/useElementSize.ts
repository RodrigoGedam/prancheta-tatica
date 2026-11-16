import { useLayoutEffect, useRef, useState } from 'react'

export type Size = { width: number; height: number }

/**
 * Mede o elemento (content box) e atualiza quando ele muda de tamanho, via ResizeObserver.
 * Usado pelo Board para recalcular a escala do canvas. Devolve `[ref, { width, height }]` em px.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      // Mesmo tamanho: devolve o objeto anterior para o React não re-renderizar.
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, size] as const
}
