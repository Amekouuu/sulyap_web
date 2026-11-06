import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { WorkflowPill } from '@/components/ui/Pill';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { DestinationPhoto } from '@/components/destinations/DestinationPhoto';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const TABS = [
  ['all', 'All'],
  ['pending_verification', 'Pending screening'],
  ['returned', 'Returned'],
  ['pending_endorsement', 'With officer'],
  ['endorsed', 'Endorsed'],
  ['rejected', 'Rejected'],
];

const NOTE = {
  pending_verification: 'Needs screening',
  pending_endorsement: 'With the Local Tourism Officer',
  returned: 'Back with the submitter',
  endorsed: 'Public',
};

export function AdminDestinationsPage() {
  const [status, setStatus] = useState('pending_verification');
  const [q, setQ] = useState('');
  const params = new URLSearchParams({ status });
  if (q.trim().length >= 2) params.set('q', q.trim());
  const { data, error } = useApi(`/admin/destinations?${params}`);
  const counts = data?.counts || {};
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Destinations
      </h1>
      <p className="mt-1 max-w-3xl text-[16px] text-muted">
        Screen nominations for spam and content that breaks the rules, then route them to the Local
        Tourism Officer of the destination&apos;s city or municipality.
      </p>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Tabs
          tabs={TABS.map(([value, label]) => ({
            value,
            label,
            count: value === 'all' ? all : counts[value] || 0,
          }))}
          value={status}
          onChange={setStatus}
          label="Destination status"
        />
        <SearchInput
          label="Search by name or town"
          placeholder="Search by name or town"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="w-full max-w-[360px]"
        />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {!data && !error && [1, 2, 3].map((n) => <Skeleton key={n} className="h-[96px]" />)}
        {error && <EmptyState title="Could not load destinations">{error.message}</EmptyState>}
        {data && !data.destinations.length && (
          <Card>
            <EmptyState icon={MapPin} title="Nothing in this list" />
          </Card>
        )}
        {data?.destinations.map((d) => (
          <Link key={d.id} to={`/admin/destinations/${d.id}`}>
            <Card className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 p-4 hover:border-forest sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:gap-6 sm:pr-6">
              <DestinationPhoto
                destination={d}
                className="h-[68px] w-[88px] rounded-ctl sm:h-[76px] sm:w-[112px]"
              />
              <div className="min-w-0 space-y-1">
                <p className="text-[17px] font-bold">{d.name}</p>
                <p className="text-[14px] text-muted">
                  {d.jurisdiction}
                  {d.categories.length ? ` · ${d.categories.join(' · ')}` : ''} · Submitted{' '}
                  {formatDate(d.submittedAt)}
                  {d.submittedBy ? ` by ${d.submittedBy}` : ''}
                </p>
                <p className="truncate text-[14px]">{d.description}</p>
              </div>
              <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                <WorkflowPill status={d.status} audience="admin" />
                {NOTE[d.status] && <span className="text-[12px] text-muted">{NOTE[d.status]}</span>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
