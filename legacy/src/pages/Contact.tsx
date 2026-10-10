import { useState, type FormEvent } from 'react'

export function Contact() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Contact
      </h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        Corrections to a listing are best raised through the report control on
        the destination itself &mdash; it reaches the right tourism officer.
        Use this form for anything else.
      </p>

      {sent ? (
        <p className="mt-10 border-l-2 border-secondary py-3 pl-4">
          Message noted. Delivery needs the server, which is not part of this
          build yet, so nothing has actually been sent.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 space-y-5" noValidate>
          <div>
            <label htmlFor="c-name" className="block text-sm font-medium">
              Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              aria-required="true"
              autoComplete="name"
              className="mt-1.5 w-full border-b bg-transparent py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="c-email" className="block text-sm font-medium">
              Email <span aria-hidden="true">*</span>
            </label>
            <input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
              aria-required="true"
              autoComplete="email"
              className="mt-1.5 w-full border-b bg-transparent py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="c-message" className="block text-sm font-medium">
              Message <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="c-message"
              rows={6}
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
              required
              aria-required="true"
              className="mt-1.5 w-full resize-y border-b bg-transparent py-2 outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Send
          </button>
        </form>
      )}
    </div>
  )
}
