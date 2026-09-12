import { NavLink, Outlet } from 'react-router-dom'
import { useSession } from '@/session/SessionContext'
import { JURISDICTION_BY_ID } from '@/constants/jurisdictions'
import { DevAccountSwitcher } from '@/components/DevAccountSwitcher'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/lto/submissions', label: 'Assigned Submissions', end: true },
  { to: '/lto/endorsed', label: 'Endorsed' },
]

/** Own header, no sidebar - matches the Local Tourism Officer Portal wireframes. */
export function LTOShell() {
  const { user, signOut } = useSession()
  const lgu = user?.jurisdiction_id
    ? JURISDICTION_BY_ID.get(user.jurisdiction_id)
    : null

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold">Sulyap</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              | Local Tourism Officer Portal
            </span>
          </div>

          <nav className="ml-6 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-muted font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {lgu && (
              <span className="hidden rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary md:inline">
                {lgu.name}
              </span>
            )}
            <button
              onClick={signOut}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Log out
            </button>
          </div>
        </div>

        <nav className="flex gap-1 border-t px-4 py-2 sm:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm',
                  isActive ? 'bg-muted font-medium' : 'text-muted-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </div>
      </main>

      <DevAccountSwitcher />
    </div>
  )
}
