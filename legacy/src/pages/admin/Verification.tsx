import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { listEndorsementProgress, type EndorsementProgress } from '@/api/admin'
import { useAsync } from '@/lib/useAsync'
import { PageHeader } from '@/components/PageHeader'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { formatDate, cn } from '@/lib/utils'

const STAGE: Record<
  EndorsementProgress['stage'],
  { label: string; tone: string }
> = {
  awaiting_screening: { label: 'Awaiting screening', tone: 'text-sage' },
  under_review: { label: 'Under review', tone: 'text-sage' },
  endorsed: { label: 'Endorsed', tone: 'text-forest' },
  returned: { label: 'Returned', tone: 'text-destructive' },
  rejected: { label: 'Rejected', tone: 'text-muted-foreground' },
}

/**
 * Oversight of endorsement progress across every jurisdiction.
 *
 * Read-only on purpose. The administrator screens a nomination before it
 * reaches an officer, but the officer's decision inside their own
 * jurisdiction stands - there is no action here to overturn it.
 */
export function Verification() {
  const { data, loading } = useAsync(() => listEndorsementProgress(), [])
  const rows = data ?? []

  const counts = (
    ['awaiting_screening', 'under_review', 'endorsed', 'rejected'] as const
  ).map((s) => ({
    label: STAGE[s].label,
    n: rows.filter((r) => r.stage === s).length,
  }))

  return (
    <>
      <PageHeader
        title="Verification"
        description="Endorsement progress across all jurisdictions, including each submission's criteria assessment."
      />

      <p className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Read only &mdash; endorsement decisions rest with the tourism officer
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 border-b pb-6 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.label}>
            <dd className="font-display text-3xl font-bold tabular-nums">
              {loading ? '—' : c.n}
            </dd>
            <dt className="mt-1 text-sm text-muted-foreground">{c.label}</dt>
          </div>
        ))}
      </dl>

      <h2 className="mt-8 text-lg font-semibold">Verification records</h2>

      <div className="mt-2">
        {loading ? (
          <ListRows>
            {Array.from({ length: 4 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </ListRows>
        ) : rows.length === 0 ? (
          <EmptyState title="No submissions yet" />
        ) : (
          <ListRows>
            {rows.map((r) => (
              <ListRow
                key={r.destination_id}
                title={
                  <Link
                    to={`/admin/destinations/${r.destination_id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {r.destination_name}
                  </Link>
                }
                meta={`${r.officer_name ?? 'Not yet routed'} · ${r.jurisdiction} · ${formatDate(r.last_activity)}`}
                body={
                  r.remarks ||
                  (r.stage === 'awaiting_screening'
                    ? 'Has not passed administrator screening yet.'
                    : 'No remarks recorded.')
                }
                trailing={
                  <>
                    <span
                      className={cn(
                        'text-[11px] font-medium uppercase tracking-wider',
                        STAGE[r.stage].tone,
                      )}
                    >
                      {STAGE[r.stage].label}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {r.criteria_met} of {r.criteria_total} criteria met
                    </span>
                  </>
                }
              />
            ))}
          </ListRows>
        )}
      </div>
    </>
  )
}
