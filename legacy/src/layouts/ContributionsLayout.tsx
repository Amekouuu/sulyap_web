import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/me/reviews', label: 'My Reviews' },
  { to: '/me/nominations', label: 'My Nominations' },
]

/** Nested inside PublicShell - its own left sub-nav, per the wireframes. */
export function ContributionsLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-3xl font-bold">Contributions</h1>

      <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 md:flex-col">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm transition-colors md:border-l-2',
                  isActive
                    ? 'bg-muted font-semibold md:border-l-primary md:bg-transparent'
                    : 'text-muted-foreground md:border-l-transparent hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
