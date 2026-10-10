import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { NotificationBell } from '@/components/shell/NotificationBell';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SkipLink } from '@/components/shell/SkipLink';
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher';
import { useSession } from '@/session/SessionContext';
import { ROLE_LABELS } from '@/constants/status';
import { cn } from '@/lib/cn';

function navItems(user) {
  const items = [
    { to: '/', label: 'Home', end: true },
    { to: '/destinations', label: 'Destinations' },
    { to: '/map', label: 'Map' },
  ];
  if (user?.role === 'registered_user')
    items.push({ to: '/contribute', label: 'My Contributions' });
  if (user?.role === 'administrator') items.push({ to: '/admin', label: 'Admin console' });
  if (user?.role === 'tourism_officer') items.push({ to: '/officer', label: 'Officer portal' });
  return items;
}

const navLinkClass = ({ isActive }) =>
  cn(
    'rounded-ctl px-4 py-2 text-[15px] transition-colors',
    isActive ? 'bg-minty-50 font-semibold text-forest' : 'text-charcoal hover:bg-cream',
  );

function notificationsPath(user) {
  if (user.role === 'administrator') return '/admin/notifications';
  if (user.role === 'tourism_officer') return '/officer/notifications';
  return '/notifications';
}

function PublicHeader() {
  const { user, setPreviewRole } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navItems(user);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  function logOut() {
    setPreviewRole('guest');
    navigate('/login');
  }

  const account = user ? (
    <div className="flex items-center gap-3">
      <NotificationBell to={notificationsPath(user)} unread={user.unreadNotifications} />
      <Avatar name={user.fullName} strong />
      <div className="hidden leading-tight xl:block">
        <p className="text-[14px] font-semibold text-charcoal">{user.fullName}</p>
        <p className="text-[12px] text-muted">{ROLE_LABELS[user.role]}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={logOut}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Log out
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Link
        to="/login"
        className="rounded-ctl px-3 py-2 text-[15px] font-semibold text-charcoal hover:bg-cream"
      >
        Log in
      </Link>
      <ButtonLink to="/signup" size="sm">
        Sign up
      </ButtonLink>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-sage bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-page items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <div className="hidden items-center gap-6 lg:flex">
          <nav aria-label="Main" className="flex items-center gap-1">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <span className="h-8 w-px bg-sage" aria-hidden="true" />
          {account}
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-ctl hover:bg-cream lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {menuOpen && (
        <div id="mobile-menu" className="border-t border-sage bg-surface px-5 pb-5 pt-3 lg:hidden">
          <nav aria-label="Main" className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 border-t border-sage pt-4">{account}</div>
        </div>
      )}
    </header>
  );
}

export function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <PublicHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <DevRoleSwitcher />
    </div>
  );
}
