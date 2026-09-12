import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

interface Errors {
  full_name?: string
  email?: string
  password?: string
  confirm?: string
}

export function Signup() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [done, setDone] = useState(false)

  function validate(): boolean {
    const next: Errors = {}
    if (!form.full_name.trim()) next.full_name = 'Enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      next.email = 'Enter a valid email address.'
    if (form.password.length < 12)
      next.password = 'Use at least 12 characters.'
    if (form.confirm !== form.password)
      next.confirm = 'Both passwords must match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (validate()) setDone(true)
  }

  const field = (
    name: keyof typeof form,
    label: string,
    type: string,
    autoComplete: string,
  ) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label} <span aria-hidden="true">*</span>
      </label>
      <input
        id={name}
        type={type}
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        required
        aria-required="true"
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        autoComplete={autoComplete}
        className="mt-1.5 w-full border-b bg-transparent py-2 outline-none focus:border-primary"
      />
      {errors[name] && (
        <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {errors[name]}
        </p>
      )}
    </div>
  )

  if (done) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight">Almost there</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Account creation needs the server, which is not part of this build
          yet. Your details were validated but not saved.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm underline decoration-primary decoration-2 underline-offset-4"
        >
          Back to log in
        </Link>
      </>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You need one to write reviews and nominate destinations.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {field('full_name', 'Full name', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field('password', 'Password', 'password', 'new-password')}
        {field('confirm', 'Confirm password', 'password', 'new-password')}

        <button
          type="submit"
          className="w-full bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Sign up
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          to="/login"
          className="underline decoration-primary decoration-2 underline-offset-4 hover:text-foreground"
        >
          Log in
        </Link>
      </p>
    </>
  )
}
