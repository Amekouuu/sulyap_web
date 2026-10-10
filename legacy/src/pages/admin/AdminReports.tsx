import { useState } from 'react'
import type { ReportStatus } from '@/types'
import { listReports } from '@/api/reports'
import { REPORT_FILTERS, REPORT_STATUS } from '@/constants/status'
import { useAsync } from '@/lib/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { FilterTabs } from '@/components/FilterTabs'
import { ReportBadge } from '@/components/StatusBadge'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { formatDate } from '@/lib/utils'

export function AdminReports() {
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending')
  const { data, loading } = useAsync(
    () => listReports(filter === 'all' ? undefined : filter),
    [filter],
  )
  const rows = data ?? []

  return (
    <>
      <PageHeader
        title="Reports"
        description="Problems raised by users about reviews, photographs, or destination information."
      />

      <div className="mt-6">
        <FilterTabs
          label="Filter reports by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            ...REPORT_FILTERS.map((s) => ({
              value: s,
              label: REPORT_STATUS[s].label,
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
          <EmptyState title="No reports in this queue" />
        ) : (
          <ListRows>
            {rows.map((r) => (
              <ListRow
                key={r.report_id}
                to={`/admin/reports/${r.report_id}`}
                title={`Report #${r.report_id}`}
                meta={`${r.target_label} · reported by ${r.reporter_name} · ${formatDate(r.created_at)}`}
                body={r.reason}
                trailing={<ReportBadge status={r.report_status} />}
              />
            ))}
          </ListRows>
        )}
      </div>
    </>
  )
}
