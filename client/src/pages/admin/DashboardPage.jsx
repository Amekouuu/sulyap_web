import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  ClipboardList,
  Flag,
  Hourglass,
  Image,
  MapPin,
  MessageSquareText,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SeasonPill, WorkflowPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatTile } from '@/components/ui/StatTile';
import { DestinationPhoto } from '@/components/destinations/DestinationPhoto';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const STATUS_BAR = [
  ['Pending screening', 'pending_verification', '#E3AA45'],
  ['Returned', 'returned', '#C9653B'],
  ['With officer', 'pending_endorsement', '#76D6A6'],
  ['Endorsed', 'endorsed', '#234638'],
  ['Rejected', 'rejected', '#CC0000'],
];

const ACTIVITY = {
  review: { icon: MessageSquareText, title: 'New review', to: '/admin/community' },
  photo: { icon: Image, title: 'New review photo', to: '/admin/community' },
  report: { icon: Flag, title: 'New report', to: (a) => `/admin/reports/${a.ref}` },
  screened: { icon: Send, title: 'Nomination screened', to: (a) => `/admin/destinations/${a.ref}` },
  endorsement: {
    icon: BadgeCheck,
    title: 'Officer decision',
    to: (a) => `/admin/destinations/${a.ref}`,
  },
};

export function DashboardPage() {
  const { data, error } = useApi('/admin/dashboard');

  if (error) return <EmptyState title="Could not load the dashboard">{error.message}</EmptyState>;
  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-[150px]" />
          ))}
        </div>
      </div>
    );
  }

  const s = data.statuses;
  const total = Object.values(s).reduce((a, b) => a + b, 0);
  const pending = [
    ['Destinations to screen', s.pending_verification || 0, '/admin/destinations', MapPin],
    ['Reviews and photos to moderate', data.moderationQueue, '/admin/community', MessageSquareText],
    ['Reports to handle', data.openReports, '/admin/reports', ClipboardList],
    ['IDs waiting for verification', data.pendingIds, '/admin/id-verification', ShieldCheck],
  ];
  const maxCategory = Math.max(1, ...data.categories.map((c) => c.n));

  return (
    <div>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Dashboard
      </h1>
      <div className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Totals">
            <Link to="/admin/destinations">
              <StatTile tone="forest" icon={MapPin} value={total} label="Destination records" />
            </Link>
            <Link to="/admin/destinations">
              <StatTile
                tone="gold"
                icon={Hourglass}
                value={s.pending_verification || 0}
                label="Pending screening"
              />
            </Link>
            <Link to="/admin/community">
              <StatTile
                tone="minty"
                icon={MessageSquareText}
                value={data.communityTotal}
                label="Community content"
              />
            </Link>
            <Link to="/admin/reports">
              <StatTile
                tone="terracotta"
                icon={ClipboardList}
                value={data.openReports}
                label="Open reports"
              />
            </Link>
          </section>

          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-[13px] text-muted">Destination records by status</p>
                <p className="num text-[26px] font-extrabold">{total}</p>
              </div>
              <div className="min-w-[240px] flex-1 space-y-3">
                <div
                  className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-sage/40"
                  role="img"
                  aria-label={STATUS_BAR.map(([l, k]) => `${l} ${s[k] || 0}`).join(', ')}
                >
                  {STATUS_BAR.filter(([, k]) => s[k]).map(([l, k, color]) => (
                    <span key={l} style={{ flex: s[k], background: color }} />
                  ))}
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                  {STATUS_BAR.map(([l, k, color]) => (
                    <li key={l} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: color }}
                        aria-hidden="true"
                      />
                      <span className="text-muted">{l}</span>
                      <span className="num font-bold">{s[k] || 0}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section aria-labelledby="latest-title" className="min-w-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="latest-title" className="text-[18px] font-bold">
                  Latest nominations
                </h2>
                <Link to="/admin/destinations" className="text-[14px] font-semibold text-forest">
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {data.latest.map((d) => (
                  <Link key={d.id} to={`/admin/destinations/${d.id}`}>
                    <Card className="flex h-full flex-col gap-3 p-3 hover:border-forest">
                      <DestinationPhoto destination={d} className="h-[120px] w-full rounded-ctl" />
                      <div className="space-y-1 px-1 pb-1">
                        <p className="font-bold leading-tight">{d.name}</p>
                        <p className="text-[12px] text-muted">
                          {d.jurisdiction} · {formatDate(d.submittedAt)}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="truncate text-[12px] text-muted">
                            by {d.submittedBy}
                          </span>
                          <WorkflowPill status={d.status} audience="admin" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
            <Card className="p-5">
              <h2 className="pb-2 text-[18px] font-bold">Recent activity</h2>
              <ul>
                {data.activity.map((a, i) => {
                  const kind = ACTIVITY[a.kind];
                  const to = typeof kind.to === 'function' ? kind.to(a) : kind.to;
                  return (
                    <li key={`${a.kind}-${a.ref}-${i}`}>
                      <Link
                        to={to}
                        className="-mx-2 flex items-start gap-3 rounded-lg border-b border-sage px-2 py-3 last:border-0 hover:bg-cream"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-minty-50">
                          <kind.icon className="h-4 w-4 text-forest" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex justify-between gap-2">
                            <span className="truncate text-[14px] font-bold">{kind.title}</span>
                            <span className="whitespace-nowrap text-[11px] text-muted">
                              {formatDate(a.at)}
                            </span>
                          </span>
                          <span className="block truncate text-[12px] text-muted">
                            {[a.place, a.who && `by ${a.who}`].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="mb-4 text-[18px] font-bold">Pending actions</h2>
            <ul className="space-y-2.5">
              {pending.map(([label, n, to, Icon]) => (
                <li key={label}>
                  <Link
                    to={to}
                    className={cn(
                      'flex items-center gap-3 rounded-ctl p-3 hover:ring-1 hover:ring-forest',
                      n ? 'bg-gold-100/70' : 'bg-cream',
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface">
                      {n ? (
                        <AlertTriangle className="h-4 w-4 text-gold-700" aria-hidden="true" />
                      ) : (
                        <Icon className="h-4 w-4 text-forest" aria-hidden="true" />
                      )}
                    </span>
                    <span className="flex-1 text-[13px] font-medium">{label}</span>
                    <span className="num min-w-[28px] rounded-lg bg-surface px-2 text-center text-[14px] font-bold leading-7">
                      {n}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-[18px] font-bold">Recently endorsed</h2>
            <ul className="space-y-3">
              {data.endorsed.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/admin/destinations/${d.id}`}
                    className="flex gap-3 rounded-ctl p-2 hover:bg-minty-50"
                  >
                    <DestinationPhoto
                      destination={d}
                      className="h-[64px] w-[80px] shrink-0 rounded-lg"
                    />
                    <span className="min-w-0 space-y-1">
                      <span className="block font-bold leading-tight">{d.name}</span>
                      <span className="block text-[12px] text-muted">
                        {d.officer} · {formatDate(d.endorsedAt)}
                      </span>
                      <SeasonPill season={d.season} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 text-[18px] font-bold">Destinations by category</h2>
            <ul className="space-y-2.5">
              {data.categories.map((c) => (
                <li
                  key={c.name}
                  className="grid grid-cols-[96px_1fr_28px] items-center gap-3 text-[13px]"
                >
                  <span>{c.name}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-sage/40">
                    <span
                      className="block h-full rounded-full bg-forest"
                      style={{ width: `${(c.n / maxCategory) * 100}%` }}
                    />
                  </span>
                  <span className="num text-right font-bold">{c.n}</span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
