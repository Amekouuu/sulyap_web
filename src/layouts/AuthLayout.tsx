import { Link, Outlet } from 'react-router-dom'
import { DevAccountSwitcher } from '@/components/DevAccountSwitcher'

/** Split-screen sign-in and sign-up. No site chrome. */
export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div
        className="hidden bg-secondary lg:block"
        role="presentation"
        aria-hidden="true"
      >
        <div className="flex h-full flex-col justify-end p-12 text-secondary-foreground">
          <p className="font-display text-3xl font-semibold leading-tight">
            Some places never make the map.
          </p>
          <p className="mt-3 max-w-sm opacity-80">
            Sulyap surfaces the destinations Pampanga has not gotten around to
            promoting yet.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="font-display text-2xl font-bold">
            Sulyap
          </Link>
          <div className="mt-8">
            <Outlet />
          </div>
        </div>
      </div>

      <DevAccountSwitcher />
    </div>
  )
}
