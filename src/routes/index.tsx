import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Board } from '@/components/board/Board'
import { BenchPanel } from '@/components/board/BenchPanel'
import { ColorWarning } from '@/components/board/ColorWarning'
import { DrawToolbar } from '@/components/board/DrawToolbar'
import { useBoardSync, useSideModel } from '@/components/board/useBoardModel'
import { useDrawShortcuts } from '@/components/board/useDrawShortcuts'

export const Route = createFileRoute('/')({ component: BoardPage })

function BoardPage() {
  const away = useSideModel('away')
  const home = useSideModel('home')
  const sides = useMemo(() => [away, home], [away, home])
  useBoardSync(sides)
  useDrawShortcuts()

  return (
    <div className="flex min-h-0 flex-1">
      <DrawToolbar />
      <main className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_40%,#16202a_0%,var(--color-ground)_70%)]">
        <ColorWarning home={home} away={away} />
        <Board sides={sides} />
      </main>
      <BenchPanel sides={sides} />
    </div>
  )
}
