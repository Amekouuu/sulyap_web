import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import type { AssessmentStatus, EndorsementStatus } from '@/types'
import { getDestination } from '@/api/destinations'
import {
  canEndorse,
  decideEndorsement,
  getAssessment,
  metCount,
  saveAssessment,
  type CriterionAssessment,
} from '@/api/lto'
import { CRITERION_1_OPTIONS, CRITERION_1_REVIEW_THRESHOLD } from '@/constants/criteria'
import { useAsync } from '@/lib/useAsync'
import { useSession } from '@/session/SessionContext'
import { formatFee, cn } from '@/lib/utils'
import { NotFound } from '@/pages/NotFound'

/**
 * The classification checklist.
 *
 * This is where the platform's central claim becomes enforceable data: the
 * officer records each of the three conditions as met or not met, with the
 * evidence behind it, and endorsement is blocked until all three are met.
 *
 * Criterion 1 captures the observed review count and the date it was seen,
 * because external platform counts drift - without the date, a later reader
 * cannot tell whether the check was correct at the time.
 */
export function ReviewSubmission() {
  const { id } = useParams()
  const destinationId = Number(id)
  const { user } = useSession()
  const navigate = useNavigate()

  const [rows, setRows] = useState<CriterionAssessment[]>([])
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const { data: d, loading } = useAsync(
    () => getDestination(destinationId),
    [destinationId],
  )
  const { data: loadedRows } = useAsync(
    () => getAssessment(destinationId),
    [destinationId],
  )

  useEffect(() => {
    if (loadedRows) setRows(loadedRows)
  }, [loadedRows])

  if (loading) return <div className="h-72 animate-pulse bg-muted" />
  if (!d) return <NotFound />

  // An officer sees only their own jurisdiction. The queue already filters,
  // but the route must enforce it too - otherwise the restriction is a
  // convenience rather than a rule.
  if (d.jurisdiction_id !== user?.jurisdiction_id) {
    return (
      <>
        <Link
          to="/lto/submissions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to assigned submissions
        </Link>
        <p className="mt-8 border-l-2 border-destructive py-2 pl-4 text-sm">
          This submission is in {d.jurisdiction.name}. You can only review
          submissions within your own jurisdiction.
        </p>
      </>
    )
  }

  const met = metCount(rows)
  const gateOpen = canEndorse(rows)

  function update(criterionId: number, patch: Partial<CriterionAssessment>) {
    setRows((prev) =>
      prev.map((r) =>
        r.criterion_id === criterionId ? { ...r, ...patch } : r,
      ),
    )
    setSaved(false)
    setError(null)
  }

  async function saveProgress() {
    setBusy(true)
    await saveAssessment({
      destinationId,
      officerId: user!.user_id,
      rows,
      draft: true,
    })
    setBusy(false)
    setSaved(true)
  }

  async function decide(decision: EndorsementStatus) {
    if (decision === 'endorsed' && !gateOpen) {
      setError('All three criteria must be recorded as met before endorsing.')
      return
    }
    if (decision !== 'endorsed' && !remarks.trim()) {
      setError(
        decision === 'returned'
          ? 'Explain what needs correcting before returning this submission.'
          : 'Give a reason before rejecting this submission.',
      )
      return
    }
    setBusy(true)
    await saveAssessment({
      destinationId,
      officerId: user!.user_id,
      rows,
      draft: false,
    })
    await decideEndorsement({
      destinationId,
      officerId: user!.user_id,
      decision,
      remarks: remarks.trim(),
    })
    setBusy(false)
    navigate('/lto/submissions')
  }

  const photos = d.primary_image ? [d.primary_image, ...d.gallery] : d.gallery

  return (
    <>
      <Link
        to="/lto/submissions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to assigned submissions
      </Link>

      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
        {d.name}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {d.location} &middot; {formatFee(d.entrance_fee)} &middot;{' '}
        {d.categories.map((c) => c.category_name).join(', ') || 'Uncategorised'}
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Read only &mdash; content can only be changed by the submitter
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold">Description</h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {d.description || 'No description provided.'}
        </p>
        <Link
          to={`/map?focus=${d.destination_id}`}
          className="mt-3 inline-block text-sm underline decoration-primary decoration-2 underline-offset-4"
        >
          View on map
        </Link>
      </section>

      {photos.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">
            Submitted photographs{' '}
            <span className="font-normal text-muted-foreground">
              ({photos.length})
            </span>
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((img) => (
              <img
                key={img.image_id}
                src={img.image_url}
                alt={img.caption}
                className="aspect-[4/3] w-full object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 border-t pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Classification checklist</h2>
          <p
            className={cn(
              'text-sm font-medium tabular-nums',
              gateOpen ? 'text-forest' : 'text-muted-foreground',
            )}
          >
            {met} of 3 criteria met
          </p>
        </div>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          All three conditions must hold. Record what you checked and when
          &mdash; external review counts change over time, so the observation
          date is part of the evidence.
        </p>

        <ol className="mt-6 divide-y border-y">
          {rows.map((r, i) => (
            <li key={r.criterion_id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-prose">
                  <h3 className="font-medium">
                    <span className="mr-2 tabular-nums text-muted-foreground">
                      {i + 1}.
                    </span>
                    {r.criterion_name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.description}
                  </p>
                </div>

                <fieldset className="flex shrink-0 gap-2">
                  <legend className="sr-only">
                    Assessment for {r.criterion_name}
                  </legend>
                  {(['met', 'not_met'] as AssessmentStatus[]).map((v) => (
                    <button
                      key={v}
                      onClick={() =>
                        update(r.criterion_id, { assessment_status: v })
                      }
                      aria-pressed={r.assessment_status === v}
                      className={cn(
                        'border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors',
                        r.assessment_status === v
                          ? v === 'met'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-destructive bg-destructive text-destructive-foreground'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {v === 'met' ? 'Met' : 'Not met'}
                    </button>
                  ))}
                </fieldset>
              </div>

              {r.criterion_id === 1 && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`count-${r.criterion_id}`}
                      className="block text-sm"
                    >
                      Review count found
                      <span className="text-muted-foreground">
                        {' '}
                        &mdash; qualifies at {CRITERION_1_REVIEW_THRESHOLD} or
                        fewer
                      </span>
                    </label>
                    <input
                      id={`count-${r.criterion_id}`}
                      type="number"
                      min={0}
                      value={r.observed_review_count ?? ''}
                      onChange={(e) =>
                        update(r.criterion_id, {
                          observed_review_count:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                      className="mt-1.5 w-full border-b bg-transparent py-1.5 outline-none focus:border-primary"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {CRITERION_1_OPTIONS.map((o) => o.label).join(' / ')}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor={`date-${r.criterion_id}`}
                      className="block text-sm"
                    >
                      Date observed
                    </label>
                    <input
                      id={`date-${r.criterion_id}`}
                      type="date"
                      value={r.observed_at ?? ''}
                      onChange={(e) =>
                        update(r.criterion_id, {
                          observed_at: e.target.value || null,
                        })
                      }
                      className="mt-1.5 w-full border-b bg-transparent py-1.5 outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label
                  htmlFor={`evidence-${r.criterion_id}`}
                  className="block text-sm"
                >
                  Evidence and notes
                </label>
                <textarea
                  id={`evidence-${r.criterion_id}`}
                  rows={2}
                  value={r.evidence}
                  onChange={(e) =>
                    update(r.criterion_id, { evidence: e.target.value })
                  }
                  placeholder="What you checked, and what you found."
                  className="mt-1.5 w-full resize-y border bg-transparent p-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <label htmlFor="lto-remarks" className="block text-sm">
          Overall remarks
          <span className="text-muted-foreground">
            {' '}
            &mdash; required to return or reject
          </span>
        </label>
        <textarea
          id="lto-remarks"
          rows={3}
          value={remarks}
          onChange={(e) => {
            setRemarks(e.target.value)
            setError(null)
          }}
          aria-invalid={!!error}
          aria-describedby={error ? 'lto-error' : undefined}
          className="mt-1.5 w-full resize-y border bg-transparent p-3 text-sm outline-none focus:border-primary"
        />
        {error && (
          <p
            id="lto-error"
            role="alert"
            className="mt-1.5 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            disabled={busy || !gateOpen}
            onClick={() => decide('endorsed')}
            title={
              gateOpen
                ? undefined
                : 'All three criteria must be met before endorsing'
            }
            className="bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Endorse
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
          <button
            disabled={busy}
            onClick={saveProgress}
            className="ml-auto border px-5 py-2.5 text-sm transition-colors hover:bg-muted disabled:opacity-50"
          >
            {saved ? 'Progress saved' : 'Save review progress'}
          </button>
        </div>

        {!gateOpen && (
          <p className="mt-4 text-sm text-muted-foreground">
            Endorsement is unavailable until all three criteria are recorded as
            met. Save your progress and come back if you still need to check
            something.
          </p>
        )}
      </section>
    </>
  )
}
