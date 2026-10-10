import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types'
import { useSession } from '@/session/SessionContext'

/**
 * Route guard. Mirrors the server-side check the Express API will perform -
 * this is a usability affordance, never the security boundary.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[]
  children: ReactNode
}) {
  const { user } = useSession()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
