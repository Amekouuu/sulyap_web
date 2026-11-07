import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';

const TYPE_LABELS = {
  account_verification: 'Account',
  new_nomination: 'New nomination',
  routed_nomination: 'Routed to you',
  endorsement: 'Endorsed',
  returned: 'Returned',
  rejected: 'Rejected',
  removed: 'Removed',
};

// Where "Open" goes for each kind of notification.
function linkFor(type, role) {
  switch (type) {
    case 'account_verification':
      return role === 'registered_user' ? '/account' : null;
    case 'new_nomination':
      return '/admin/destinations';
    case 'routed_nomination':
      return '/officer';
    case 'endorsement':
    case 'returned':
    case 'rejected':
      return '/contribute/nominations';
    case 'removed':
      return '/contribute/reviews';
    default:
      return null;
  }
}

const when = (iso) =>
  new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

// Notifications for every role. contained: add page padding (public pages).
export function NotificationsPage({ contained = true }) {
  const { user, refresh } = useSession();
  const toast = useToast();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const list = useApi(`/notifications?unread=${onlyUnread}&page=${page}&v=${version}`);
  const data = list.data;

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: 'POST' });
      setVersion((v) => v + 1);
      refresh();
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    }
  }
  async function markAll() {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setVersion((v) => v + 1);
      refresh();
      toast.show('All notifications marked as read.');
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    }
  }

  // E-mail links point to /notifications; staff read theirs inside their own console.
  if (contained && user.role === 'administrator')
    return <Navigate to="/admin/notifications" replace />;
  if (contained && user.role === 'tourism_officer')
    return <Navigate to="/officer/notifications" replace />;

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className={cn(contained && 'mx-auto max-w-page px-5 py-12 sm:px-8')}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
            Notifications
          </h1>
          <p className="text-[15px] text-muted">
            {data ? `${data.unread} unread · ` : ''}A copy of each is also sent to your e-mail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div
            className="flex rounded-[10px] border border-sage p-1"
            role="group"
            aria-label="Show"
          >
            {[
              [false, 'All'],
              [true, 'Unread'],
            ].map(([value, label]) => (
              <button
                key={label}
                type="button"
                aria-pressed={onlyUnread === value}
                onClick={() => {
                  setOnlyUnread(value);
                  setPage(1);
                }}
                className={cn(
                  'h-9 rounded-[8px] px-4 text-[14px] font-semibold',
                  onlyUnread === value ? 'bg-forest text-white' : 'text-charcoal hover:bg-cream',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={markAll} disabled={!data?.unread}>
            Mark all as read
          </Button>
        </div>
      </div>

      <Card className="mt-8 max-w-3xl overflow-hidden">
        {list.error && (
          <EmptyState icon={Bell} title="Could not load notifications">
            {list.error.message}
          </EmptyState>
        )}
        {!data && !list.error && <Skeleton className="h-[240px] w-full" />}
        {data && !data.notifications.length && (
          <EmptyState
            icon={Bell}
            title={onlyUnread ? 'No unread notifications' : 'No notifications yet'}
          >
            Updates about your account and submissions appear here.
          </EmptyState>
        )}
        {data?.notifications.length > 0 && (
          <ul className="divide-y divide-sage">
            {data.notifications.map((n) => {
              const to = linkFor(n.type, user.role);
              return (
                <li key={n.id} className={cn('flex gap-4 px-5 py-4', !n.isRead && 'bg-minty-50')}>
                  <span
                    className={cn(
                      'mt-2 h-2.5 w-2.5 shrink-0 rounded-full',
                      n.isRead ? 'bg-transparent' : 'bg-pin',
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-[13px] font-semibold text-muted">
                      {TYPE_LABELS[n.type] || 'Update'} · {when(n.createdAt)}
                      {!n.isRead && <span className="sr-only"> · unread</span>}
                    </p>
                    <p className="break-words text-[15px] text-charcoal">{n.message}</p>
                    <div className="mt-1 flex flex-wrap gap-4 text-[14px] font-semibold">
                      {to && (
                        <Link
                          to={to}
                          onClick={() => !n.isRead && markRead(n.id)}
                          className="text-forest underline"
                        >
                          Open
                        </Link>
                      )}
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="text-muted underline hover:text-charcoal"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-sage px-5 py-3 text-[14px]">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Newer
            </Button>
            <span className="text-muted">
              Page {page} of {pages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Older
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
