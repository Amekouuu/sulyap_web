import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  getReport,
  markUnderReview,
  resolveReport,
} from '@/api/reports'
import { useAsync } from '@/lib/useAsync'
import { useSession } from '@/session/SessionContext'
import { ReportBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib/utils'
import { NotFound } from '@/pages/NotFound'

export function ReportDetail() {
  const { id } = useParams()
  const reportId = Number(id)
  const { user } = useSession()
  const navigate = useNavigate()
  const [nonce, setNonce] = useState(0)
  const [busy, setBusy] = useState(false)

  const { data: r, loading } = useAsync(
    () => getReport(reportId),
    [reportId, nonce],
  )

  if (loading) {
    return <div className="h-64 animate-pulse bg-muted" />
  }
  if (!r) return <NotFound />

  const open = r.report_status === 'pending' || r.report_status === 'under_review'

  async function decide(outcome: 'remove_content' | 'keep_content') {
    setBusy(true)
    await resolveReport({ reportId, adminId: user!.user_id, outcome })
    setBusy(false)
    navigate('/admin/reports')
  }

  const facts: [string, React.ReactNode][] = [
    ['Reason', r.reason],
    [
      'Reported content',
      r.target_href ? (
        <Link to={r.target_href} className="underline underline-offset-4">
          {r.target_label}
        </Link>
      ) : (
        r.target_label
      ),
    ],
    ['Reported by', r.reporter_name],
    ['Submitted', formatDate(r.created_at)],
    ['Status', <ReportBadge status={r.report_status} />],
  ]
  if (r.resolved_at) {
    facts.push(['Closed', formatDate(r.resolved_at)])
  }

  return (
    <>
      <Link
        to="/admin/reports"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to reports
      </Link>

      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
        Report #{r.report_id}
      </h1>

      <dl className="mt-8 divide-y border-y text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[10rem_1fr] gap-4 py-3.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {open ? (
        <div className="mt-8">
          <p className="mb-4 max-w-prose text-sm text-muted-foreground">
            Closing a report records what happened to the content. Removing is
            permanent &mdash; removed content cannot be edited back into view.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={() => decide('remove_content')}
              className="bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Remove content and resolve
            </button>
            <button
              disabled={busy}
              onClick={() => decide('keep_content')}
              className="border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              Keep content and dismiss
            </button>
            {r.report_status === 'pending' && (
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  await markUnderReview(reportId)
                  setBusy(false)
                  setNonce((n) => n + 1)
                }}
                className="px-4 py-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
              >
                Mark under review
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-8 border-l-2 border-secondary py-2 pl-4 text-sm text-muted-foreground">
          This report is closed. Reopening is not available &mdash; file a new
          report if the problem recurs.
        </p>
      )}
    </>
  )
}
