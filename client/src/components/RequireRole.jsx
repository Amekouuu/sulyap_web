import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { homePathFor, useSession } from '@/session/SessionContext';

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-forest" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

// Shows the page only to signed-in users with one of the given roles.
// Guests go to the login page and come back here afterwards.
// The server checks every request again; this only keeps people out of pages they cannot use.
export function RequireRole({ roles, children }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <PageLoading />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to this page"
          action={<ButtonLink to={homePathFor(user)}>Go to your home page</ButtonLink>}
        >
          This page is for a different type of account.
        </EmptyState>
      </div>
    );
  }
  return children ?? <Outlet />;
}

// Login and sign-up pages: people who are already signed in go to their home page instead.
export function GuestOnly({ children }) {
  const { user, loading } = useSession();
  if (loading) return <PageLoading />;
  if (user) return <Navigate to={homePathFor(user)} replace />;
  return children;
}
