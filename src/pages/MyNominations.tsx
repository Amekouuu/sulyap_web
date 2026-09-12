import { Link } from 'react-router-dom'
import { listMyNominations } from '@/api/destinations'
import { useAsync } from '@/lib/useAsync'
import { useSession } from '@/session/SessionContext'
import { DESTINATION_WORKFLOW } from '@/constants/status'
import { WorkflowBadge } from '@/components/StatusBadge'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { formatDate } from '@/lib/utils'

export function MyNominations() {
  const { user } = useSession()
  const { data, loading } = useAsync(
    () => listMyNominations(user!.user_id),
    [user?.user_id],
  )
  const rows = data ?? []

  if (loading) {
    return (
      <ListRows>
        {Array.from({ length: 3 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </ListRows>
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="You have not nominated anything yet"
        hint="Know a place that has not been written about? Nominate it and the tourism officer for that municipality will review it."
      />
    )
  }

  return (
    <ListRows>
      {rows.map((d) => {
        const meta = DESTINATION_WORKFLOW[d.workflow_status]
        return (
          <ListRow
            key={d.destination_id}
            thumbnail={
              d.primary_image ? (
                <img
                  src={d.primary_image.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null
            }
            title={d.name || 'Untitled draft'}
            meta={`${d.jurisdiction.name} · updated ${formatDate(d.updated_at)}`}
            body={d.description || 'No description written yet.'}
            trailing={
              <>
                <WorkflowBadge
                  status={d.workflow_status}
                  audience="submitter"
                />
                {/* Edit rights are state-scoped, so the control appears only where it applies. */}
                {meta.submitterCanEdit && (
                  <Link
                    to={`/nominate?edit=${d.destination_id}`}
                    className="text-sm underline decoration-primary decoration-2 underline-offset-4"
                  >
                    {d.workflow_status === 'draft'
                      ? 'Continue'
                      : d.workflow_status === 'returned'
                        ? 'Fix and resubmit'
                        : 'Edit'}
                  </Link>
                )}
              </>
            }
          />
        )
      })}
    </ListRows>
  )
}
