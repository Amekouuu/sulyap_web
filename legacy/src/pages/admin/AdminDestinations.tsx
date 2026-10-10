import { useState } from 'react'
import { listForReview } from '@/api/destinations'
import { ADMIN_DESTINATION_FILTERS, DESTINATION_WORKFLOW } from '@/constants/status'
import type { DestinationWorkflowStatus } from '@/types'
import { useAsync } from '@/lib/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { FilterTabs } from '@/components/FilterTabs'
import { WorkflowBadge } from '@/components/StatusBadge'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { formatDate } from '@/lib/utils'

const ALL = ADMIN_DESTINATION_FILTERS

export function AdminDestinations() {
  const [filter, setFilter] = useState<DestinationWorkflowStatus | 'all'>(
    'pending_verification',
  )

  const { data, loading } = useAsync(
    () => listForReview({ statuses: filter === 'all' ? [...ALL] : [filter] }),
    [filter],
  )
  const rows = data ?? []

  return (
    <>
      <PageHeader
        title="Destinations"
        description="Screen nominations for spam and policy violations, then route them to the responsible tourism officer."
      />

      <div className="mt-6">
        <FilterTabs
          label="Filter destinations by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            ...ALL.map((s) => ({
              value: s,
              label: DESTINATION_WORKFLOW[s].labels.admin ?? s,
            })),
          ]}
        />
      </div>

      <div className="mt-2">
        {loading ? (
          <ListRows>
            {Array.from({ length: 3 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </ListRows>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing in this queue"
            hint="Nominations appear here as soon as a registered user submits them."
          />
        ) : (
          <ListRows>
            {rows.map((d) => (
              <ListRow
                key={d.destination_id}
                to={`/admin/destinations/${d.destination_id}`}
                thumbnail={
                  d.primary_image ? (
                    <img
                      src={d.primary_image.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null
                }
                title={d.name || 'Untitled nomination'}
                meta={`${d.jurisdiction.name} · ${d.categories.map((c) => c.category_name).join(', ') || 'Uncategorised'} · ${formatDate(d.updated_at)}`}
                body={d.description || 'No description provided.'}
                trailing={
                  <WorkflowBadge
                    status={d.workflow_status}
                    audience="admin"
                  />
                }
              />
            ))}
          </ListRows>
        )}
      </div>
    </>
  )
}
