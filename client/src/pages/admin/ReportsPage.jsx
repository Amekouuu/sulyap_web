import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Image, MapPin, MessageSquareText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const TABS = [
  ['all', 'All'],
  ['pending', 'Pending'],
  ['under_review', 'Under review'],
  ['resolved', 'Resolved'],
  ['dismissed', 'Dismissed'],
];
const TARGET = {
  review: { icon: MessageSquareText, label: 'Review' },
  image: { icon: Image, label: 'Photo' },
  destination: { icon: MapPin, label: 'Destination' },
};

export function ReportsPage() {
  const [status, setStatus] = useState('all');
  const { data, error } = useApi(`/admin/reports?status=${status}`);
  const counts = data?.counts || {};

  return (
    <div>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Reports
      </h1>
      <p className="mt-1 max-w-3xl text-[16px] text-muted">
        Problems raised by registered users about reviews, photos, or destination information.
      </p>
      <Tabs
        className="mt-6"
        tabs={TABS.map(([value, label]) => ({
          value,
          label,
          count:
            value === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[value] || 0,
        }))}
        value={status}
        onChange={setStatus}
        label="Report status"
      />
      <div className="mt-6 flex flex-col gap-3">
        {!data && !error && [1, 2, 3].map((n) => <Skeleton key={n} className="h-[88px]" />)}
        {error && <EmptyState title="Could not load reports">{error.message}</EmptyState>}
        {data && !data.reports.length && (
          <Card>
            <EmptyState icon={ClipboardList} title="Nothing in this list" />
          </Card>
        )}
        {data?.reports.map((r) => {
          const t = TARGET[r.target];
          return (
            <Link key={r.id} to={`/admin/reports/${r.id}`}>
              <Card className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-4 p-4 hover:border-forest sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-5 sm:p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-ctl border border-sage bg-cream sm:h-14 sm:w-14">
                  <t.icon className="h-6 w-6 text-forest" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-[17px] font-bold">Report #{r.id}</p>
                  <p className="text-[14px] text-muted">
                    {t.label} · {r.destination.name} · by {r.reportedBy} · {formatDate(r.createdAt)}
                  </p>
                  <p className="truncate text-[15px]">{r.reason}</p>
                </div>
                <div className="col-span-2 flex justify-end sm:col-span-1">
                  <ReportPill status={r.status} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
