import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/cn';

// Bell with the unread count. The list itself arrives in Phase B7.
export function NotificationBell({ to, unread = 0, className }) {
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
