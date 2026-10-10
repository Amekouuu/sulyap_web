import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listPendingVerification, listUsers } from '@/api/users'
import { JURISDICTION_BY_ID } from '@/constants/jurisdictions'
import type { User, UserRole } from '@/types'
import { useAsync, useDebounced } from '@/lib/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { FilterTabs } from '@/components/FilterTabs'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { formatDate, cn } from '@/lib/utils'

type View = 'all' | 'pending'

const ROLE_LABEL: Record<UserRole, string> = {
  registered_user: 'Registered User',
  administrator: 'Administrator',
  tourism_officer: 'Tourism Officer',
}

/** Only officers carry a jurisdiction - it is null for everyone else. */
function subtitle(u: User): string {
  const role = ROLE_LABEL[u.role]
  if (u.role !== 'tourism_officer' || !u.jurisdiction_id) return role
  return `${role} · ${JURISDICTION_BY_ID.get(u.jurisdiction_id)?.name ?? ''}`
}

function VerificationMark({ u }: { u: User }) {
  if (u.role !== 'registered_user') return null
  return (
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
  )
}

/**
 * Two views over one set of accounts. "All users" is the directory;
 * "Awaiting verification" is a work queue, so it shows the ID itself rather
 * than just a status - the administrator should be able to see what they are
 * about to review before opening it.
 */
export function AdminUsers() {
  const [params, setParams] = useSearchParams()
  const view: View = params.get('view') === 'pending' ? 'pending' : 'all'
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query)

  const { data: all, loading: loadingAll } = useAsync(() => listUsers(), [])
  const { data: pending, loading: loadingPending } = useAsync(
    () => listPendingVerification(),
    [view],
  )

  const pendingCount = pending?.length ?? 0
  const q = debounced.trim().toLowerCase()
  const matches = (u: User) =>
    !q ||
    u.full_name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q)

  const allRows = (all ?? []).filter(matches)
  const pendingRows = (pending ?? []).filter(matches)
  const loading = view === 'all' ? loadingAll : loadingPending

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts across the platform, and registered users waiting on identity verification."
      />

      <div className="mt-6">
        <FilterTabs<View>
          label="Choose a user view"
          value={view}
          onChange={(next) =>
            setParams(next === 'pending' ? { view: 'pending' } : {}, {
              replace: true,
            })
          }
          options={[
            { value: 'all', label: 'All users', count: all?.length },
            {
              value: 'pending',
              label: 'Awaiting verification',
              count: pendingCount,
            },
          ]}
        />
      </div>

      <div className="mt-5 max-w-sm">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name or email"
          label="Search users"
        />
      </div>

      <div className="mt-2">
        {loading ? (
          <ListRows>
            {Array.from({ length: 3 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </ListRows>
        ) : view === 'all' ? (
          allRows.length === 0 ? (
            <EmptyState title="No users match" />
          ) : (
            <ListRows>
              {allRows.map((u) => (
                <ListRow
                  key={u.user_id}
                  to={`/admin/users/${u.user_id}`}
                  title={u.full_name}
                  meta={subtitle(u)}
                  body={u.email}
                  trailing={
                    <span className="flex flex-col items-end gap-1">
                      <span
                        className={cn(
                          'text-[11px] uppercase tracking-wider',
                          u.account_status === 'suspended'
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {u.account_status}
                      </span>
                      <VerificationMark u={u} />
                    </span>
                  }
                />
              ))}
            </ListRows>
          )
        ) : pendingRows.length === 0 ? (
          <EmptyState
            title="Nobody is waiting on verification"
            hint="New registrations appear here with the ID they uploaded."
          />
        ) : (
          <ListRows>
            {pendingRows.map((u) => (
              <ListRow
                key={u.user_id}
                to={`/admin/users/${u.user_id}/verify`}
                thumbnail={
                  u.id_document_url ? (
                    <img
                      src={u.id_document_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null
                }
                title={u.full_name}
                meta={`${u.contact_number} · registered ${formatDate(u.created_at)}`}
                body={u.home_address ?? 'No address on file'}
                trailing={
                  <>
                    <VerificationMark u={u} />
                    <span className="text-sm underline decoration-primary decoration-2 underline-offset-4">
                      Review ID
                    </span>
                  </>
                }
              />
            ))}
          </ListRows>
        )}
      </div>

      {view === 'all' && pendingCount > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          {pendingCount} {pendingCount === 1 ? 'person is' : 'people are'}{' '}
          waiting on ID verification.{' '}
          <Link
            to="/admin/users?view=pending"
            className="text-foreground underline decoration-primary decoration-2 underline-offset-4"
          >
            Review now
          </Link>
        </p>
      )}
    </>
  )
}
