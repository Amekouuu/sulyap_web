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
 * Decisions the officer has already made. Read-only by design - a decided
 * submission cannot be edited, only viewed, because the officer has no edit
 * right over destination content at any stage.
 */
export function EndorsedSubmissions() {
  const { user } = useSession()
  const lgu = user?.jurisdiction_id
    ? JURISDICTION_BY_ID.get(user.jurisdiction_id)
    : null

  const { data, loading } = useAsync(
    () =>
      listForReview({
        statuses: ['endorsed', 'returned', 'rejected'],
        jurisdictionId: user?.jurisdiction_id ?? undefined,
      }),
    [user?.jurisdiction_id],
  )
  const rows = data ?? []

  return (
    <>
      <div className="border-b pb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Decided
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Submissions in {lgu?.name ?? 'your jurisdiction'} you have already
          endorsed, returned, or rejected.
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
          <EmptyState title="No decisions yet" />
        ) : (
          <ListRows>
            {rows.map((d) => (
              <ListRow
                key={d.destination_id}
                to={`/destinations/${d.destination_id}`}
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
                meta={`${d.location} · ${formatDate(d.updated_at)}`}
                body={d.description}
                trailing={
                  <>
                    <WorkflowBadge status={d.workflow_status} audience="lto" />
                    <span className="text-sm text-muted-foreground underline underline-offset-4">
                      View details
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
