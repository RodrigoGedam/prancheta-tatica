import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { BoardHeaderControls } from '@/components/board/BoardHeaderControls'

export const Route = createRootRoute({ component: RootLayout })

const navLink =
  'rounded-lg px-3 py-2 text-sm font-medium text-muted no-underline transition-colors hover:text-ink'
const navLinkActive = 'bg-control font-semibold text-ink'

function RootLayout() {
  const onBoard = useRouterState({ select: (s) => s.location.pathname === '/' })
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-6 border-b border-line bg-surface px-5">
        <Link to="/" className="flex items-center gap-2.5 text-ink no-underline">
          <Logo />
          <span className="font-display text-2xl font-bold tracking-wider">CAMPINHO</span>
        </Link>
        {onBoard ? <BoardHeaderControls /> : <div className="flex-1" />}
        <nav className="flex items-center gap-1.5" aria-label="Principal">
          <Link to="/" className={navLink} activeProps={{ className: navLinkActive }} activeOptions={{ exact: true }}>
            Prancheta
          </Link>
          <Link to="/times" className={navLink} activeProps={{ className: navLinkActive }}>
            Times
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="3" y="1.5" width="20" height="23" rx="2" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      <line x1="3" y1="13" x2="23" y2="13" stroke="var(--color-accent)" strokeWidth="2" />
      <circle cx="13" cy="13" r="3.5" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
    </svg>
  )
}
