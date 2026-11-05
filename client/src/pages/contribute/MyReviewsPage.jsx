import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModerationPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { Stars } from '@/components/destinations/Stars';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const NOTE = {
  pending: 'Waiting for an administrator. Not public yet.',
  approved: 'Public on the destination page.',
  flagged: 'Flagged after a report. An administrator is checking it.',
  removed: 'Removed by an administrator.',
};

export function MyReviewsPage() {
  const [status, setStatus] = useState('all');
  const { data, error } = useApi('/reviews/mine');
  const all = data?.reviews || [];
  const shown = status === 'all' ? all : all.filter((r) => r.status === status);
  const tabs = ['all', 'pending', 'approved', 'removed'].map((value) => ({
    value,
    label: value === 'all' ? 'All' : value[0].toUpperCase() + value.slice(1),
    count: value === 'all' ? all.length : all.filter((r) => r.status === value).length,
  }));

  return (
    <div className="space-y-5">
      <Tabs tabs={tabs} value={status} onChange={setStatus} label="Review status" />
      <Card className="overflow-hidden">
        {!data && !error && (
          <div className="space-y-3 p-5">
            {[1, 2].map((n) => (
              <Skeleton key={n} className="h-24 w-full" />
            ))}
          </div>
        )}
        {error && <EmptyState title="Could not load your reviews">{error.message}</EmptyState>}
        {data && !shown.length && (
          <EmptyState
            icon={MessageSquare}
            title={all.length ? 'Nothing here' : 'No reviews yet'}
            action={!all.length && <ButtonLink to="/destinations">Browse destinations</ButtonLink>}
          >
            {!all.length && 'Open an endorsed destination you have visited and write a review.'}
          </EmptyState>
        )}
        <ul className="divide-y divide-sage/70">
          {shown.map((r) => (
            <li key={r.id} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                {r.destination.public ? (
                  <Link
                    to={`/destinations/${r.destination.id}`}
                    className="font-semibold text-charcoal hover:text-forest"
                  >
                    {r.destination.name}
                  </Link>
                ) : (
                  <span className="font-semibold">{r.destination.name}</span>
                )}
                <ModerationPill status={r.status} />
                <Stars value={r.rating} className="h-3.5 w-3.5" />
                <span className="text-[12px] text-muted">{formatDate(r.createdAt)}</span>
              </div>
              {r.text && <p className="whitespace-pre-line text-[15px]">{r.text}</p>}
              {r.photos.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Photos with this review">
                  {r.photos.map((p) => (
                    <li key={p.id}>
                      <img
                        src={p.url}
                        alt="Your review photo"
                        className="h-16 w-20 rounded-[8px] object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[13px] text-muted">{NOTE[r.status]}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
