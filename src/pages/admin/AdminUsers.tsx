import { useState } from 'react'
import { listUsers } from '@/api/users'
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
import { cn } from '@/lib/utils'

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

export function AdminUsers() {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<UserRole | 'all'>('all')
  const debounced = useDebounced(query)
  const { data, loading } = useAsync(() => listUsers(), [])

  const rows = (data ?? [])
    .filter((u) => (role === 'all' ? true : u.role === role))
    .filter((u) => {
      const q = debounced.trim().toLowerCase()
      if (!q) return true
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts, roles, and identity verification across the platform."
      />

      <div className="mt-6 max-w-sm">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name or email"
          label="Search users"
        />
      </div>

      <div className="mt-6">
        <FilterTabs
          label="Filter users by role"
          value={role}
          onChange={setRole}
          options={[
            { value: 'all', label: 'All' },
            { value: 'registered_user', label: 'Registered' },
            { value: 'tourism_officer', label: 'Officers' },
            { value: 'administrator', label: 'Administrators' },
          ]}
        />
      </div>

      <div className="mt-2">
        {loading ? (
          <ListRows>
            {Array.from({ length: 4 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </ListRows>
        ) : rows.length === 0 ? (
          <EmptyState title="No users match" />
        ) : (
          <ListRows>
            {rows.map((u) => (
              <ListRow
                key={u.user_id}
                to={`/admin/users/${u.user_id}`}
                title={u.full_name}
                meta={subtitle(u)}
                body={u.email}
                trailing={
                  <span className="flex flex-col items-end gap-1 text-[11px] uppercase tracking-wider">
                    <span
                      className={cn(
                        u.account_status === 'suspended'
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                      )}
                    >
                      {u.account_status}
                    </span>
                    {u.role === 'registered_user' && (
                      <span
                        className={cn(
                          u.account_verification_status === 'verified'
                            ? 'text-forest'
                            : u.account_verification_status === 'rejected'
                              ? 'text-destructive'
                              : 'text-sage',
                        )}
                      >
                        ID {u.account_verification_status}
                      </span>
                    )}
                  </span>
                }
              />
            ))}
          </ListRows>
        )}
      </div>
    </>
  )
}
