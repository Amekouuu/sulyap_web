import { listForReview } from '@/api/destinations'
import { useAsync } from '@/lib/useAsync'
import { useSession } from '@/session/SessionContext'
import { JURISDICTION_BY_ID } from '@/constants/jurisdictions'
import { WorkflowBadge } from '@/components/StatusBadge'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { formatDate } from '@/lib/utils'

/**
 * The officer's queue. Scoped to their own jurisdiction - an officer never
 * sees a submission from another municipality, which is a functional
 * requirement in its own right rather than a convenience.
 */
export function AssignedSubmissions() {
  const { user } = useSession()
  const lgu = user?.jurisdiction_id
    ? JURISDICTION_BY_ID.get(user.jurisdiction_id)
    : null

  const { data, loading } = useAsync(
    () =>
      listForReview({
        statuses: ['pending_endorsement'],
        jurisdictionId: user?.jurisdiction_id ?? undefined,
      }),
    [user?.jurisdiction_id],
  )
  const rows = data ?? []

  return (
    <>
      <div className="border-b pb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Assigned Submissions
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Nominations in {lgu?.name ?? 'your jurisdiction'} that have passed
          administrator screening and are waiting on your assessment.
        </p>
      </div>

      <div className="mt-2">
        {loading ? (
          <ListRows>
            {Array.from({ length: 2 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </ListRows>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing waiting on you"
            hint={`Nominations in ${lgu?.name ?? 'your jurisdiction'} appear here once an administrator has screened them.`}
          />
        ) : (
          <ListRows>
            {rows.map((d) => (
              <ListRow
                key={d.destination_id}
                to={`/lto/submissions/${d.destination_id}`}
                thumbnail={
                  d.primary_image ? (
                    <img
                      src={d.primary_image.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null
                }
                title={d.name}
                meta={`${d.location} · screened ${formatDate(d.updated_at)}`}
                body={d.description}
                trailing={
                  <>
                    <WorkflowBadge status={d.workflow_status} audience="lto" />
                    <span className="text-sm underline decoration-primary decoration-2 underline-offset-4">
                      Review
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
