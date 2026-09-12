import { Link } from 'react-router-dom'
import { listMyReviews } from '@/api/reviews'
import { useAsync } from '@/lib/useAsync'
import { useSession } from '@/session/SessionContext'
import { db } from '@/mocks/store'
import { CONTENT_MODERATION } from '@/constants/status'
import { ModerationBadge } from '@/components/StatusBadge'
import { Rating } from '@/components/Rating'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { formatDate } from '@/lib/utils'

export function MyReviews() {
  const { user } = useSession()
  const { data, loading } = useAsync(
    () => listMyReviews(user!.user_id),
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
        title="No reviews yet"
        hint="Reviews you write appear here with their moderation status."
      />
    )
  }

  return (
    <ListRows>
      {rows.map((r) => {
        const dest = db.destinations.find(
          (d) => d.destination_id === r.destination_id,
        )
        const canEdit = CONTENT_MODERATION[r.moderation_status].editable
        return (
          <ListRow
            key={r.review_id}
            title={
              <Link
                to={`/destinations/${r.destination_id}`}
                className="underline-offset-4 hover:underline"
              >
                {dest?.name ?? 'Removed destination'}
              </Link>
            }
            meta={
              <span className="flex items-center gap-2">
                <Rating value={r.rating} />
                {formatDate(r.created_at)}
              </span>
            }
            body={r.review_text}
            trailing={
              <>
                <ModerationBadge status={r.moderation_status} />
                {/* `removed` is terminal - no edit path back into public view. */}
                {canEdit ? (
                  <button className="text-sm underline decoration-primary decoration-2 underline-offset-4">
                    Edit
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Removed by a moderator
                  </span>
                )}
              </>
            }
          />
        )
      })}
    </ListRows>
  )
}
