import { NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '@/session/SessionContext'
import { DevAccountSwitcher } from '@/components/DevAccountSwitcher'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/destinations', label: 'Destinations' },
  { to: '/map', label: 'Map' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export function PublicShell() {
  const { user } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <NavLink to="/" className="font-display text-xl font-bold">
            Sulyap
          </NavLink>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {user ? (
              <NavLink
                to="/me/nominations"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                My Contributions
              </NavLink>
            ) : (
              <NavLink
                to="/login"
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Log in
              </NavLink>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label="Toggle navigation menu"
              className="rounded-md p-2 hover:bg-muted md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t px-4 py-2 md:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          <p className="font-display text-base font-semibold text-foreground">
            Sulyap
          </p>
          <p className="mt-1 max-w-prose">
            An LGU-supported platform for discovering lesser-known tourist
            destinations across Pampanga.
          </p>
        </div>
      </footer>

      <DevAccountSwitcher />
    </div>
  )
}
