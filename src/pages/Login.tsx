import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@/mocks/store'
import { useSession } from '@/session/SessionContext'

const ROLE_HOME = {
  registered_user: '/',
  administrator: '/admin',
  tourism_officer: '/lto/submissions',
} as const

/**
 * Matches a seeded email and signs in. The password field is present and
 * required so the form behaves like the real one, but nothing is verified
 * client-side - hashing and verification belong to the Express API.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { signIn } = useSession()
  const navigate = useNavigate()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const account = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    )
    if (!account) {
      setError('No account found with that email address.')
      return
    }
    if (account.account_status === 'suspended') {
      setError('This account has been suspended. Contact an administrator.')
      return
    }
    signIn(account.user_id)
    navigate(ROLE_HOME[account.role])
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Browsing does not need an account. Log in to review, nominate, or
        moderate.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            required
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            autoComplete="email"
            className="mt-1.5 w-full border-b bg-transparent py-2 outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
            autoComplete="current-password"
            className="mt-1.5 w-full border-b bg-transparent py-2 outline-none focus:border-primary"
          />
        </div>

        {error && (
          <p id="login-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Log in
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        No account yet?{' '}
        <Link
          to="/signup"
          className="underline decoration-primary decoration-2 underline-offset-4 hover:text-foreground"
        >
          Sign up
        </Link>
      </p>

      <p className="mt-10 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
        Demo build: any seeded email works and the password is not checked.
        Try <span className="text-foreground">juandelacruz@gmail.com</span> for
        a resident account, or use the account switcher in the corner.
      </p>
    </>
  )
}
