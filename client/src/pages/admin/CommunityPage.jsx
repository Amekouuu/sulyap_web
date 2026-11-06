import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageSquareText, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModerationPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { Stars } from '@/components/destinations/Stars';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const TABS = [
  ['pending', 'Waiting'],
  ['flagged', 'Flagged'],
  ['approved', 'Approved'],
  ['removed', 'Removed'],
  ['all', 'All'],
];
const TYPES = [
  ['all', 'Reviews and photos'],
  ['review', 'Reviews'],
  ['photo', 'Photos'],
];

export function CommunityPage() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('all');
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(null);
  const { data, error } = useApi(`/admin/community?status=${status}&type=${type}&v=${version}`);
  const counts = data?.counts || {};

  async function moderate(item, to) {
    if (to === 'removed' && !window.confirm(`Remove this ${item.type}? This cannot be undone.`))
      return;
    setBusy(`${item.type}-${item.id}`);
    try {
      await api(`/admin/community/${item.type}/${item.id}`, {
        method: 'PATCH',
        body: { status: to },
      });
      toast.show(to === 'approved' ? 'Approved. It is now public.' : 'Removed.');
      setVersion((v) => v + 1);
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Community Content
      </h1>
      <p className="mt-1 max-w-3xl text-[16px] text-muted">
        Reviews and review photos from registered users. They stay hidden until you approve them.
        Removed content cannot be restored.
      </p>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Tabs
          tabs={TABS.map(([value, label]) => ({
            value,
            label,
            count:
              value === 'all'
                ? Object.values(counts).reduce((a, b) => a + b, 0)
                : counts[value] || 0,
          }))}
          value={status}
          onChange={setStatus}
          label="Moderation status"
        />
        <div className="flex gap-2" role="group" aria-label="Content type">
          {TYPES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={cn(
                'h-9 rounded-full border px-3 text-[13px] font-semibold',
                type === value ? 'border-forest bg-forest text-white' : 'border-sage bg-surface',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {!data && !error && [1, 2, 3].map((n) => <Skeleton key={n} className="h-[100px]" />)}
        {error && <EmptyState title="Could not load content">{error.message}</EmptyState>}
        {data && !data.items.length && (
          <Card>
            <EmptyState icon={MessageSquareText} title="Nothing in this list" />
          </Card>
        )}
        {data?.items.map((item) => {
          const key = `${item.type}-${item.id}`;
          return (
            <Card
              as="article"
              key={key}
              className="grid grid-cols-[72px_minmax(0,1fr)] items-start gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:p-5"
            >
              {item.type === 'photo' ? (
                <a href={item.url} target="_blank" rel="noreferrer">
                  <img
                    src={item.url}
                    alt={`Photo by ${item.by}`}
                    className="h-[54px] w-[72px] rounded-ctl object-cover sm:h-[72px] sm:w-[96px]"
                  />
                </a>
              ) : (
                <span className="flex h-[54px] w-[72px] items-center justify-center rounded-ctl bg-minty-50 sm:h-[72px] sm:w-[96px]">
                  <MessageSquareText className="h-7 w-7 text-forest" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-baseline gap-3">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {item.type}
                  </span>
                  <Link
                    to={`/destinations/${item.destination.id}`}
                    className="font-bold hover:text-forest"
                  >
                    {item.destination.name}
                  </Link>
                  {item.rating && <Stars value={item.rating} className="h-3.5 w-3.5" />}
                </p>
                <p className="text-[14px] text-muted">
                  {item.by} · {formatDate(item.createdAt)}
                  {item.photoCount ? ` · ${item.photoCount} photo(s)` : ''}
                  {item.openReport && (
                    <>
                      {' · '}
                      <Link
                        to={`/admin/reports/${item.openReport}`}
                        className="font-semibold text-terracotta-700"
                      >
                        Reported in #{item.openReport}
                      </Link>
                    </>
                  )}
                </p>
                {item.text && (
                  <p
                    className={cn(
                      'whitespace-pre-line text-[15px]',
                      item.status === 'removed' && 'text-muted line-through',
                    )}
                  >
                    {item.text}
                  </p>
                )}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                <ModerationPill status={item.status} />
                {item.status !== 'removed' && (
                  <div className="flex gap-2">
                    {item.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busy === key}
                        onClick={() => moderate(item, 'approved')}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-ctl bg-forest text-minty hover:bg-forest-600 disabled:opacity-50"
                        aria-label={`Approve ${item.type} by ${item.by}`}
                      >
                        <Check className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy === key}
                      onClick={() => moderate(item, 'removed')}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-ctl border border-sage text-pin hover:border-pin disabled:opacity-50"
                      aria-label={`Remove ${item.type} by ${item.by}`}
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
