import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, MapPinned } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/shell/NotificationBell';
import { SkipLink } from '@/components/shell/SkipLink';
import { SlimFooter } from '@/components/shell/SlimFooter';
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher';
import { useSession } from '@/session/SessionContext';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/officer', label: 'Submissions', end: true },
  { to: '/officer/reviewed', label: 'Reviewed' },
];

// "Jurisdictions: All 22" or the assigned cities and municipalities.
function jurisdictionLabel(jurisdictions) {
  if (jurisdictions === 'all') return 'Jurisdictions: All 22';
  if (!jurisdictions?.length) return 'No jurisdiction assigned';
  return `${jurisdictions.length === 1 ? 'Jurisdiction' : 'Jurisdictions'}: ${jurisdictions.join(', ')}`;
}

export function OfficerShell() {
  const { user, setPreviewRole } = useSession();
  const navigate = useNavigate();

  function logOut() {
    setPreviewRole('guest');
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <SkipLink />
      <header className="border-b border-sage bg-surface">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Logo to="/officer" />
            <span className="hidden h-8 w-px bg-sage sm:block" aria-hidden="true" />
            <span className="hidden text-[15px] text-muted sm:block">
              Local Tourism Officer Portal
            </span>
            <nav aria-label="Officer portal" className="flex items-center gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-ctl px-4 py-2 text-[15px] transition-colors',
                      isActive
                        ? 'bg-forest font-semibold text-white'
                        : 'text-charcoal hover:bg-cream',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-ctl bg-minty-50 px-3 py-2 text-[13px] font-semibold text-forest">
              <MapPinned className="h-4 w-4" aria-hidden="true" />
              {jurisdictionLabel(user?.jurisdictions)}
            </span>
            <NotificationBell to="/officer/notifications" unread={user?.unreadNotifications} />
            <Avatar name="Tourism Officer" strong />
            <Button variant="secondary" size="sm" onClick={logOut}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-page flex-1 px-5 py-10 sm:px-8 lg:py-12">
        <Outlet />
      </main>
      <SlimFooter
        area="Officer portal"
        note="Officer accounts are operated by the Sulyap development team with ACTOP approval."
      />
      <DevRoleSwitcher />
    </div>
  );
}
