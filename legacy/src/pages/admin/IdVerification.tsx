import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { decideVerification, getUser } from '@/api/users'
import { useAsync } from '@/lib/useAsync'
import { formatDate, cn } from '@/lib/utils'
import { NotFound } from '@/pages/NotFound'

/**
 * Administrator review of a registered user's submitted ID.
 *
 * Verification exists to stop one person holding several accounts, and it
 * gates submission rights - an unverified user can browse but cannot review,
 * upload photos, or nominate. So the decision here is consequential: it is
 * shown alongside the details the ID should corroborate.
 */
export function IdVerification() {
  const { id } = useParams()
  const userId = Number(id)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<'verified' | 'rejected' | null>(
    null,
  )

  const { data: u, loading } = useAsync(() => getUser(userId), [userId])

  if (loading) return <div className="h-72 animate-pulse bg-muted" />
  if (!u || u.role !== 'registered_user') return <NotFound />

  const pending = u.account_verification_status === 'pending'

  async function decide(decision: 'verified' | 'rejected') {
    setBusy(true)
    await decideVerification({ userId, decision })
    setBusy(false)
    navigate('/admin/users?view=pending')
  }

  const facts: [string, string][] = [
    ['Full name', u.full_name],
    ['Email', u.email],
    ['Contact number', u.contact_number || '—'],
    ['Home address', u.home_address || '—'],
    ['Registered', formatDate(u.created_at)],
  ]

  return (
    <>
      <Link
        to="/admin/users?view=pending"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to verification queue
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            ID Verification
          </h1>
          <p className="mt-1 text-muted-foreground">{u.full_name}</p>
        </div>
        <span
          className={cn(
            'text-[11px] font-medium uppercase tracking-wider',
            u.account_verification_status === 'verified'
              ? 'text-forest'
              : u.account_verification_status === 'rejected'
                ? 'text-destructive'
                : 'text-sage',
          )}
        >
          ID {u.account_verification_status}
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <section>
          <h2 className="text-sm font-semibold">Submitted ID</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Check the name and photo match the details on the right, and that
            the document looks genuine and current.
          </p>
          {u.id_document_url ? (
            <img
              src={u.id_document_url}
              alt={`Government ID submitted by ${u.full_name}`}
              className="mt-4 aspect-[1.586] w-full border object-cover"
            />
          ) : (
            <p className="mt-4 border border-dashed p-8 text-center text-sm text-muted-foreground">
              No ID document on file.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold">Registration details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            What the ID should corroborate.
          </p>
          <dl className="mt-4 divide-y border-y text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-4 py-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {pending ? (
        <section className="mt-10 border-t pt-8">
          <h2 className="text-sm font-semibold">Decision</h2>
          <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Verifying lets this person write reviews, upload photographs, and
            nominate destinations. Until then they can browse only.
          </p>

          {confirming ? (
            <div className="mt-5 border-l-2 border-foreground py-1 pl-4">
              <p className="text-sm">
                {confirming === 'verified'
                  ? `Verify ${u.full_name} and grant submission rights?`
                  : `Reject ${u.full_name}'s ID? They will stay browse-only.`}
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  disabled={busy}
                  onClick={() => decide(confirming)}
                  className={cn(
                    'px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50',
                    confirming === 'verified'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-destructive text-destructive-foreground',
                  )}
                >
                  {confirming === 'verified' ? 'Yes, verify' : 'Yes, reject'}
                </button>
                <button
                  disabled={busy}
                  onClick={() => setConfirming(null)}
                  className="px-5 py-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => setConfirming('verified')}
                className="bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Verify ID
              </button>
              <button
                onClick={() => setConfirming('rejected')}
                className="border border-destructive px-5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                Reject ID
              </button>
            </div>
          )}
        </section>
      ) : (
        <p className="mt-10 border-l-2 border-secondary py-2 pl-4 text-sm text-muted-foreground">
          This ID has already been {u.account_verification_status}.
        </p>
      )}
    </>
  )
}
