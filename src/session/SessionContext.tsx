import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@/types'
import { db } from '@/mocks/store'

/*
  Stand-in for real authentication until the Express API exists.

  Deliberately NOT a single all-seeing account: signing in as a specific
  tourism officer is what exercises the jurisdiction visibility rule, which
  is a functional requirement in its own right. A superadmin shortcut would
  leave that filter untested.
*/

interface SessionValue {
  user: User | null
  signIn: (userId: number) => void
  signOut: () => void
  isRole: (...roles: User['role'][]) => boolean
}

const SessionContext = createContext<SessionValue | undefined>(undefined)
const SESSION_KEY = 'sulyap.session.v1'

function readStoredUserId(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(readStoredUserId)

  useEffect(() => {
    try {
      if (userId === null) localStorage.removeItem(SESSION_KEY)
      else localStorage.setItem(SESSION_KEY, String(userId))
    } catch {
      /* storage unavailable - session is still valid in memory */
    }
  }, [userId])

  const user = useMemo(
    () => db.users.find((u) => u.user_id === userId) ?? null,
    [userId],
  )

  const signIn = useCallback((id: number) => setUserId(id), [])
  const signOut = useCallback(() => setUserId(null), [])
  const isRole = useCallback(
    (...roles: User['role'][]) => (user ? roles.includes(user.role) : false),
    [user],
  )

  const value = useMemo(
    () => ({ user, signIn, signOut, isRole }),
    [user, signIn, signOut, isRole],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}
