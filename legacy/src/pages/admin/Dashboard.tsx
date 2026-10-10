import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { listForReview } from '@/api/destinations'
import { listCommunityContent, listScreeningLog } from '@/api/admin'
import { listReports } from '@/api/reports'
import { useAsync } from '@/lib/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { formatDate } from '@/lib/utils'

/**
 * Counts first, then the work queue. The counts answer "how big is this",
 * the queue answers "what do I do now" - an admin opening this page wants
 * both, so neither replaces the other.
 */
export function AdminDashboard() {
  const { data: pending } = useAsync(
    () => listForReview({ statuses: ['pending_verification'] }),
    [],
  )
  const { data: allDest } = useAsync(
    () =>
      listForReview({
        statuses: [
          'pending_verification',
          'returned',
          'pending_endorsement',
          'endorsed',
          'rejected',
        ],
      }),
    [],
  )
  const { data: content } = useAsync(() => listCommunityContent('pending'), [])
  const { data: reports } = useAsync(() => listReports('pending'), [])
  const { data: log } = useAsync(() => listScreeningLog(), [])

  const counts = [
    ['Destinations', allDest?.length],
    ['Pending screening', pending?.length],
    ['Content to moderate', content?.length],
    ['Open reports', reports?.length],
  ] as const

  const queue = [
    {
      label: 'Destinations awaiting screening',
      count: pending?.length ?? 0,
      to: '/admin/destinations',
    },
    {
      label: 'Community content to moderate',
      count: content?.length ?? 0,
      to: '/admin/community',
    },
    {
      label: 'Reports needing a decision',
      count: reports?.length ?? 0,
      to: '/admin/reports',
    },
  ].filter((q) => q.count > 0)

  return (
    <>
      <PageHeader title="Dashboard" />

      <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-b pb-8 sm:grid-cols-4">
        {counts.map(([label, n]) => (
          <div key={label}>
            <dd className="font-display text-3xl font-bold tabular-nums">
              {n ?? '—'}
            </dd>
            <dt className="mt-1 text-sm text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Needs your attention</h2>
        {queue.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing is waiting. New nominations and reports will appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y border-y">
            {queue.map((q) => (
              <li key={q.to}>
                <Link
                  to={q.to}
                  className="group flex items-center gap-4 py-4 transition-colors hover:bg-muted/40"
                >
                  <span className="w-8 font-display text-2xl tabular-nums">
                    {q.count}
                  </span>
                  <span className="flex-1 text-sm">{q.label}</span>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Recent activity</h2>
        <ul className="mt-4 divide-y border-y">
          {(log ?? []).slice(0, 5).map((e) => (
            <li key={`${e.kind}-${e.id}`} className="py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm">
                  <span className="font-medium">{e.destination_name}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    {e.status} by {e.actor_name}
                  </span>
                </p>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatDate(e.created_at)}
                </span>
              </div>
              {e.remarks && (
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {e.remarks}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
