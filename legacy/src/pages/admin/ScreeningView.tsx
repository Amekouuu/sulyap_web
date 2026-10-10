import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { getDestination } from '@/api/destinations'
import {
  reopenRejected,
  screenDestination,
  type ScreeningDecision,
} from '@/api/admin'
import { useAsync } from '@/lib/useAsync'
import { useSession } from '@/session/SessionContext'
import { WorkflowBadge } from '@/components/StatusBadge'
import { formatDate, formatFee } from '@/lib/utils'
import { NotFound } from '@/pages/NotFound'

/**
 * The administrator's screening view.
 *
 * Built from the paper rather than a wireframe: the administrator module
 * "supports destination verification", and the functional requirements give
 * the administrator a return action alongside verify and reject.
 *
 * Four affordances and no more - verify, return, reject, and read-only
 * content. There is deliberately no editable field anywhere on this page:
 * the administrator routes a submission, never rewrites it.
 */
export function ScreeningView() {
  const { id } = useParams()
  const destinationId = Number(id)
  const { user } = useSession()
  const navigate = useNavigate()

  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: d, loading } = useAsync(
    () => getDestination(destinationId),
    [destinationId],
  )

  if (loading) return <div className="h-72 animate-pulse bg-muted" />
  if (!d) return <NotFound />

  const awaitingScreening = d.workflow_status === 'pending_verification'
  const isRejected = d.workflow_status === 'rejected'

  async function decide(decision: ScreeningDecision) {
    // A return or rejection without a reason leaves the submitter guessing.
    if (decision !== 'verified' && !remarks.trim()) {
      setError(
        decision === 'returned'
          ? 'Explain what needs correcting before returning this nomination.'
          : 'Give a reason before rejecting this nomination.',
      )
      return
    }
    setBusy(true)
    await screenDestination({
      destinationId,
      administratorId: user!.user_id,
      decision,
      remarks: remarks.trim(),
    })
    setBusy(false)
    navigate('/admin/destinations')
  }

  async function reopen() {
    if (!remarks.trim()) {
      setError('Explain why this rejection is being reopened.')
      return
    }
    setBusy(true)
    await reopenRejected({
      destinationId,
      administratorId: user!.user_id,
      remarks: remarks.trim(),
    })
    setBusy(false)
    navigate('/admin/destinations')
  }

  const facts: [string, string][] = [
    ['Municipality', `${d.jurisdiction.name}, ${d.jurisdiction.province}`],
    ['Location', d.location || '-'],
    ['Coordinates', `${d.latitude}, ${d.longitude}`],
    [
      'Category',
      d.categories.map((c) => c.category_name).join(', ') || 'Not set',
    ],
    ['Entrance fee', formatFee(d.entrance_fee)],
    ['Best time to visit', d.best_time_to_visit || 'Not specified'],
    ['Safety reminders', d.safety_reminders || 'None recorded'],
    ['Submitted', formatDate(d.created_at)],
  ]

  const photos = d.primary_image ? [d.primary_image, ...d.gallery] : d.gallery

  return (
    <>
      <Link
        to="/admin/destinations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to destinations
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {d.name || 'Untitled nomination'}
        </h1>
        <WorkflowBadge status={d.workflow_status} audience="admin" />
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Read only &mdash; content can only be changed by the submitter
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Description</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {d.description || 'No description provided.'}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="sr-only">Submission details</h2>
        <dl className="divide-y border-y text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[10rem_1fr] gap-4 py-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">
          Submitted photographs{' '}
          <span className="font-normal text-muted-foreground">
            ({photos.length})
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Check that the photographs actually show the place described. A
          mismatch is the most common reason to return a nomination.
        </p>
        {photos.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No photographs submitted.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((img) => (
              <figure key={img.image_id}>
                <img
                  src={img.image_url}
                  alt={img.caption}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="mt-1.5 text-xs text-muted-foreground">
                  {img.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {(awaitingScreening || isRejected) && (
        <section className="mt-10 border-t pt-8">
          <h2 className="text-sm font-semibold">
            {isRejected ? 'Reopen this rejection' : 'Screening decision'}
          </h2>

          <label htmlFor="remarks" className="mt-4 block text-sm">
            Remarks
            {!isRejected && (
              <span className="text-muted-foreground">
                {' '}
                &mdash; required to return or reject
              </span>
            )}
          </label>
          <textarea
            id="remarks"
            rows={3}
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value)
              setError(null)
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'remarks-error' : undefined}
            placeholder="What the submitter needs to know."
            className="mt-1.5 w-full resize-y border bg-transparent p-3 text-sm outline-none focus:border-primary"
          />
          {error && (
            <p
              id="remarks-error"
              role="alert"
              className="mt-1.5 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {isRejected ? (
              <button
                disabled={busy}
                onClick={reopen}
                className="bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Reopen for correction
              </button>
            ) : (
              <>
                <button
                  disabled={busy}
                  onClick={() => decide('verified')}
                  className="bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Verify and route to {d.jurisdiction.name}
                </button>
                <button
                  disabled={busy}
                  onClick={() => decide('returned')}
                  className="border border-destructive px-5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                >
                  Return for correction
                </button>
                <button
                  disabled={busy}
                  onClick={() => decide('rejected')}
                  className="px-5 py-2.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {!awaitingScreening && !isRejected && (
        <p className="mt-10 border-l-2 border-secondary py-2 pl-4 text-sm text-muted-foreground">
          This nomination has already been screened. It now sits with the{' '}
          {d.jurisdiction.name} tourism office.
        </p>
      )}
    </>
  )
}
