import type { Report, ReportStatus } from '@/types'
import { db, nowIso, persist } from '@/mocks/store'
import { respond } from './client'

export interface ReportView extends Report {
  reporter_name: string
  target_label: string
  target_kind: 'review' | 'image' | 'destination'
  target_href: string | null
}

function resolve(r: Report): ReportView {
  const reporter = db.users.find((u) => u.user_id === r.reported_by)
  let target_label = 'Unknown target'
  let target_kind: ReportView['target_kind'] = 'destination'
  let target_href: string | null = null

  if (r.review_id !== null) {
    target_kind = 'review'
    const review = db.reviews.find((x) => x.review_id === r.review_id)
    const dest = db.destinations.find(
      (d) => d.destination_id === review?.destination_id,
    )
    target_label = `Review on ${dest?.name ?? 'a removed destination'}`
    target_href = dest ? `/destinations/${dest.destination_id}` : null
  } else if (r.image_id !== null) {
    target_kind = 'image'
    const img = db.images.find((x) => x.image_id === r.image_id)
    const dest = db.destinations.find(
      (d) => d.destination_id === img?.destination_id,
    )
    target_label = `Photo on ${dest?.name ?? 'a removed destination'}`
    target_href = dest ? `/destinations/${dest.destination_id}` : null
  } else if (r.destination_id !== null) {
    const dest = db.destinations.find(
      (d) => d.destination_id === r.destination_id,
    )
    target_label = dest?.name ?? 'Removed destination'
    target_href = dest ? `/destinations/${dest.destination_id}` : null
  }

  return {
    ...r,
    reporter_name: reporter?.full_name ?? 'Former member',
    target_label,
    target_kind,
    target_href,
  }
}

export async function listReports(
  status?: ReportStatus,
): Promise<ReportView[]> {
  const rows = db.reports
    .filter((r) => (status ? r.report_status === status : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(resolve)
  return respond(rows)
}

export async function getReport(id: number): Promise<ReportView | null> {
  const row = db.reports.find((r) => r.report_id === id)
  return respond(row ? resolve(row) : null)
}

/**
 * Resolving a report writes a content outcome in the same action. Leaving
 * the two decoupled is how content ends up removed with the report still
 * open, or a report closed with the content untouched.
 */
export async function resolveReport(opts: {
  reportId: number
  adminId: number
  outcome: 'remove_content' | 'keep_content'
}): Promise<void> {
  const report = db.reports.find((r) => r.report_id === opts.reportId)
  if (!report) return

  if (opts.outcome === 'remove_content') {
    if (report.review_id !== null) {
      const review = db.reviews.find((x) => x.review_id === report.review_id)
      if (review) {
        review.moderation_status = 'removed'
        review.updated_at = nowIso()
      }
    }
    if (report.image_id !== null) {
      const img = db.images.find((x) => x.image_id === report.image_id)
      if (img) {
        img.moderation_status = 'removed'
        img.updated_at = nowIso()
      }
    }
    report.report_status = 'resolved'
  } else {
    report.report_status = 'dismissed'
  }

  report.resolved_by = opts.adminId
  report.resolved_at = nowIso()
  report.updated_at = nowIso()
  persist()
}

export async function markUnderReview(reportId: number): Promise<void> {
  const report = db.reports.find((r) => r.report_id === reportId)
  if (!report) return
  report.report_status = 'under_review'
  report.updated_at = nowIso()
  persist()
}
