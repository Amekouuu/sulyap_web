import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getUser } from '@/api/users'
import { JURISDICTION_BY_ID } from '@/constants/jurisdictions'
import { useAsync } from '@/lib/useAsync'
import { useSession } from '@/session/SessionContext'
import { formatDate, cn } from '@/lib/utils'
import { NotFound } from '@/pages/NotFound'

const ROLE_LABEL = {
  registered_user: 'Registered User',
  administrator: 'Administrator',
  tourism_officer: 'Tourism Officer',
} as const

export function UserDetail() {
  const { id } = useParams()
  const { user: me } = useSession()
  const { data: u, loading } = useAsync(() => getUser(Number(id)), [id])

  if (loading) return <div className="h-64 animate-pulse bg-muted" />
  if (!u) return <NotFound />

  const isOfficer = u.role === 'tourism_officer'
  const isSelf = me?.user_id === u.user_id
  // Suspension applies to residents only, and never to your own account.
  const canSuspend = u.role === 'registered_user' && !isSelf

  const facts: [string, React.ReactNode][] = [
    ['Email', u.email],
    ['Contact number', u.contact_number || '—'],
    ['Role', ROLE_LABEL[u.role]],
  ]

  // Jurisdiction is only meaningful for officers - it is null for everyone else.
  if (isOfficer && u.jurisdiction_id) {
    facts.push([
      'Jurisdiction',
      JURISDICTION_BY_ID.get(u.jurisdiction_id)?.name ?? '—',
    ])
  }

  if (u.role === 'registered_user') {
    facts.push(
      ['Home address', u.home_address || '—'],
      [
        'ID verification',
        <span
          className={cn(
            'text-sm',
            u.account_verification_status === 'verified'
              ? 'text-forest'
              : u.account_verification_status === 'rejected'
                ? 'text-destructive'
                : 'text-sage',
          )}
        >
          {u.account_verification_status}
          {u.account_verification_status === 'pending' &&
            ' — cannot submit content until verified'}
        </span>,
      ],
    )
  }

  facts.push(
    ['Account status', u.account_status],
    ['Member since', formatDate(u.created_at)],
  )

  return (
    <>
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to users
      </Link>

      <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
        {u.full_name}
      </h1>

      <dl className="mt-8 divide-y border-y text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[10rem_1fr] gap-4 py-3.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {canSuspend && (
        <div className="mt-8">
          <button className="border border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground">
            {u.account_status === 'suspended'
              ? 'Reinstate account'
              : 'Suspend account'}
          </button>
        </div>
      )}
      {isSelf && (
        <p className="mt-8 text-sm text-muted-foreground">
          This is your own account. Suspension controls are hidden.
        </p>
      )}
    </>
  )
}
