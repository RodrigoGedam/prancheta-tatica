import { Link, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { AuthMenu } from '@/components/AuthMenu'
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
        <Link to="/" className="flex shrink-0 items-center gap-1.5 text-ink no-underline">
          <Logo />
          <span className="flex flex-col font-display text-lg leading-none font-bold tracking-wider whitespace-nowrap">
            <span>PRANCHETA</span>
            <span className="text-accent">TÁTICA</span>
          </span>
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
        <AuthMenu />
      </header>
      <Outlet />
    </div>
  )
}

function Logo() {
  return (
    // Símbolo 01 "Jogada" (docs/design/identidade-2026-11/logos/logo-01-simbolo.svg).
    <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="8" y="4" width="32" height="41" rx="5" fill="var(--color-action)" />
      <rect x="18" y="7.5" width="12" height="4.5" rx="2.25" fill="var(--color-on-accent)" />
      <g fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16.5" cy="34.5" r="3.6" stroke="var(--color-on-accent)" />
        <path d="M27.5 31L33 36.5M33 31L27.5 36.5" stroke="var(--color-on-accent)" />
        <path d="M16.5 27.6C16.5 21.6 21 18.5 31 18.5M27.5 14.5L32 18.5L27.5 22.5" stroke="var(--color-accent)" />
      </g>
    </svg>
  )
}
