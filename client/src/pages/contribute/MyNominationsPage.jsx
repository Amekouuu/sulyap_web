import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPinPlus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { WorkflowPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { DestinationPhoto } from '@/components/destinations/DestinationPhoto';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const GROUPS = [
  { value: 'all', label: 'All', statuses: null },
  { value: 'draft', label: 'Drafts', statuses: ['draft'] },
  {
    value: 'review',
    label: 'In review',
    statuses: ['pending_verification', 'pending_endorsement'],
  },
  { value: 'returned', label: 'Returned', statuses: ['returned'] },
  { value: 'done', label: 'Decided', statuses: ['endorsed', 'rejected'] },
];

const NEXT_STEP = {
  draft: 'Not submitted yet. Finish it and submit.',
  pending_verification: 'Waiting for an administrator to screen it.',
  pending_endorsement: 'With the Local Tourism Officer for review.',
  returned: 'Returned for changes. Edit it and submit again.',
  endorsed: 'Endorsed and public on Sulyap.',
  rejected: 'Not endorsed.',
};

function linkFor(n) {
  if (n.status === 'endorsed') return `/destinations/${n.id}`;
  return `/nominate/${n.id}/edit`;
}

export function MyNominationsPage() {
  const [group, setGroup] = useState('all');
  const { data, error } = useApi('/nominations');
  const all = data?.nominations || [];
  const wanted = GROUPS.find((g) => g.value === group).statuses;
  const shown = wanted ? all.filter((n) => wanted.includes(n.status)) : all;
  const tabs = GROUPS.map((g) => ({
    value: g.value,
    label: g.label,
    count: g.statuses ? all.filter((n) => g.statuses.includes(n.status)).length : all.length,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={tabs} value={group} onChange={setGroup} label="Nomination status" />
        <ButtonLink to="/nominate">
          <MapPinPlus className="h-4 w-4" aria-hidden="true" />
          Nominate a destination
        </ButtonLink>
      </div>
      <Card className="overflow-hidden">
        {!data && !error && (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-20 w-full" />
            ))}
          </div>
        )}
        {error && <EmptyState title="Could not load your nominations">{error.message}</EmptyState>}
        {data && !shown.length && (
          <EmptyState
            icon={MapPinPlus}
            title={all.length ? 'Nothing here' : 'No nominations yet'}
            action={!all.length && <ButtonLink to="/nominate">Nominate a destination</ButtonLink>}
          >
            {!all.length && 'Know a lesser-known place in Pampanga? Nominate it.'}
          </EmptyState>
        )}
        <ul className="divide-y divide-sage/70">
          {shown.map((n) => (
            <li key={n.id}>
              <Link to={linkFor(n)} className="flex items-center gap-4 px-5 py-4 hover:bg-cream">
                <DestinationPhoto
                  destination={n}
                  src={n.photos[0]?.url || null}
                  className="h-16 w-20 shrink-0 rounded-ctl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-charcoal">{n.name}</p>
                    <WorkflowPill status={n.status} />
                  </div>
                  <p className="text-[13px] text-muted">
                    {n.jurisdiction} · Updated {formatDate(n.updatedAt)}
                  </p>
                  <p className="mt-1 text-[13px]">{NEXT_STEP[n.status]}</p>
                  {['returned', 'rejected'].includes(n.status) && n.lastDecision?.remarks && (
                    <p className="mt-1 line-clamp-2 text-[13px] text-terracotta-700">
                      Remarks: {n.lastDecision.remarks}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
