import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCog, X } from 'lucide-react'
import type { User } from '@/types'
import { listSwitchableAccounts } from '@/api/users'
import { JURISDICTION_BY_ID } from '@/constants/jurisdictions'
import { useSession } from '@/session/SessionContext'
import { cn } from '@/lib/utils'

/** Each role lands on the screen it actually works from. */
const ROLE_HOME: Record<User['role'], string> = {
  registered_user: '/',
  administrator: '/admin',
  tourism_officer: '/lto/submissions',
}

const ROLE_LABEL: Record<User['role'], string> = {
  registered_user: 'Registered User',
  administrator: 'Administrator',
  tourism_officer: 'Tourism Officer',
}

/**
 * Development-only account switcher. Remove before the defence build.
 *
 * Exists so the jurisdiction visibility rule is exercised from the first
 * commit: each officer sees only their own municipality, which a single
 * shared account would never reveal.
 */
export function DevAccountSwitcher() {
  const { user, signIn, signOut } = useSession()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<User[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    listSwitchableAccounts().then(setAccounts)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 text-sm">
      {open && (
        <div className="mb-2 w-72 overflow-hidden rounded-lg border bg-card shadow-lg animate-fade-rise">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Switch account
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close account switcher"
              className="rounded p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {accounts.map((a) => {
              const lgu = a.jurisdiction_id
                ? JURISDICTION_BY_ID.get(a.jurisdiction_id)?.name
                : null
              return (
                <li key={a.user_id}>
                  <button
                    onClick={() => {
                      signIn(a.user_id)
                      setOpen(false)
                      navigate(ROLE_HOME[a.role])
                    }}
                    className={cn(
                      'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted',
                      user?.user_id === a.user_id && 'bg-muted',
                    )}
                  >
                    <span className="font-medium">{a.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ROLE_LABEL[a.role]}
                      {lgu ? ` · ${lgu}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
            <li className="border-t">
              <button
                onClick={() => {
                  signOut()
                  setOpen(false)
                  navigate('/')
                }}
                className="w-full px-3 py-2 text-left text-muted-foreground hover:bg-muted"
              >
                Sign out (browse as guest)
              </button>
            </li>
          </ul>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-lg transition-colors hover:bg-muted"
      >
        <UserCog className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-medium">
          {user ? user.full_name : 'Guest'}
        </span>
      </button>
    </div>
  )
}
