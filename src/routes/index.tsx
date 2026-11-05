import { createFileRoute } from '@tanstack/react-router'
import { Board } from '@/components/board/Board'

export const Route = createFileRoute('/')({ component: BoardPage })

function BoardPage() {
  return (
    <div className="flex min-h-0 flex-1">
      <aside
        aria-label="Ferramentas de desenho"
        className="w-[68px] shrink-0 border-r border-line bg-surface"
      >
        {/* Toolbar de desenho: etapa 4. */}
      </aside>
      <main className="flex min-w-0 flex-1 bg-[radial-gradient(circle_at_50%_40%,#16202a_0%,var(--color-ground)_70%)]">
        <Board />
      </main>
      <aside aria-label="Bancos de reservas" className="w-[340px] shrink-0 border-l border-line bg-surface">
        {/* Bancos: etapa 3. */}
      </aside>
    </div>
  )
}
