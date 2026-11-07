import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  LayoutGrid,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/shell/NotificationBell';
import { SkipLink } from '@/components/shell/SkipLink';
import { SlimFooter } from '@/components/shell/SlimFooter';
import { useSession } from '@/session/SessionContext';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';

// Admin console navigation. `count` names the number of items waiting (GET /admin/counts).
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/admin/destinations', label: 'Destinations', icon: MapPin, count: 'destinations' },
  {
    to: '/admin/community',
    label: 'Community Content',
    icon: MessageSquare,
    count: 'community',
  },
  { to: '/admin/reports', label: 'Reports', icon: ClipboardList, count: 'reports' },
  { to: '/admin/users', label: 'Users', icon: User },
  { to: '/admin/id-verification', label: 'ID Verification', icon: ShieldCheck, count: 'ids' },
  { to: '/admin/screening-lists', label: 'Screening Lists', icon: ListChecks },
];

function SidebarContent({ user, onLogOut, counts }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        <Logo to="/admin" />
        <p className="mt-2 pl-[46px] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Admin console
        </p>
      </div>
      <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-4">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-ctl px-4 py-3 text-[15px] transition-colors',
                isActive ? 'bg-forest font-semibold text-white' : 'text-charcoal hover:bg-cream',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.label}
                {item.count && counts?.[item.count] > 0 && (
                  <span
                    className={cn(
                      'num ml-auto min-w-[22px] rounded-md px-1.5 text-center text-[12px] font-bold leading-[22px]',
                      isActive ? 'bg-minty text-forest' : 'bg-minty-100 text-forest',
                    )}
                  >
                    {counts[item.count]}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 border-t border-sage p-4">
        <div className="flex items-center gap-3">
          <NavLink
            to="/admin/account"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-ctl p-1 hover:bg-cream"
            aria-label="Account settings"
          >
            <Avatar name={user?.fullName} strong />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[14px] font-semibold text-charcoal">
                {user?.fullName}
              </span>
              <span className="block text-[12px] text-muted">Administrator</span>
            </span>
          </NavLink>
          <NotificationBell to="/admin/notifications" unread={user?.unreadNotifications} />
        </div>
        <Button variant="secondary" className="w-full" onClick={onLogOut}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </div>
  );
}

export function AdminShell() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  // Refreshed on every page change, so the numbers follow the work done.
  const { data: counts } = useApi(`/admin/counts?at=${encodeURIComponent(location.pathname)}`);

  async function logOut() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <SkipLink />
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 border-r border-sage bg-surface lg:block">
        <SidebarContent user={user} onLogOut={logOut} counts={counts} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-charcoal/40"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
          <aside id="admin-menu" className="relative h-full w-[280px] bg-surface shadow-pop">
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-ctl hover:bg-cream"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarContent user={user} onLogOut={logOut} counts={counts} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-sage bg-surface px-5 lg:hidden">
          <Logo to="/admin" />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-ctl hover:bg-cream"
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <main id="main" className="flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <Outlet />
        </main>
        <SlimFooter
          area="Admin"
          note="Administrator accounts are held by the Sulyap development team."
        />
      </div>
    </div>
  );
}
