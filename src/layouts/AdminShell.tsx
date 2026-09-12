import { NavLink, Outlet } from 'react-router-dom'
import {
  ClipboardCheck,
  Flag,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Users,
} from 'lucide-react'
import { useSession } from '@/session/SessionContext'
import { DevAccountSwitcher } from '@/components/DevAccountSwitcher'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/destinations', label: 'Destinations', icon: MapPin },
  { to: '/admin/community', label: 'Community Content', icon: MessageSquare },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/verification', label: 'Verification Log', icon: ClipboardCheck },
]

export function AdminShell() {
  const { user, signOut } = useSession()

  return (
    <div className="flex min-h-screen">
      <div
        className="fixed inset-x-0 top-0 z-50 h-0.5 bg-primary"
        aria-hidden="true"
      />
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/40 lg:flex">
        <div className="px-6 py-5">
          <p className="font-display text-xl font-bold">Sulyap</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Admin Dashboard
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-background font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <p className="px-3 pb-2 text-xs text-muted-foreground">
            {user?.full_name}
          </p>
          <button
            onClick={signOut}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Tablet and below: the sidebar collapses to a horizontal rail. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t bg-background lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-w-[5rem] flex-1 flex-col items-center gap-1 px-2 py-2 text-[11px]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Outlet />
        </div>
      </main>

      <DevAccountSwitcher />
    </div>
  )
}
