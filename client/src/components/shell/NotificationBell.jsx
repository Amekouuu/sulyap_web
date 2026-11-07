import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';

const POLL_MS = 60 * 1000;

// Bell with the unread count, refreshed every minute while the tab is visible.
export function NotificationBell({ to, unread = 0, className }) {
  const { setUser } = useSession();
  useEffect(() => {
    // A failed check (offline, server restarting) keeps the current session as it is.
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      api('/auth/me')
        .then((data) => data.user && setUser(data.user))
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [setUser]);
  const label = unread ? `Notifications, ${unread} unread` : 'Notifications';
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        'relative inline-flex h-10 w-10 items-center justify-center rounded-ctl text-charcoal hover:bg-cream',
        className,
      )}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 && (
        <span className="num absolute right-1 top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-pin px-1 text-[10px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
