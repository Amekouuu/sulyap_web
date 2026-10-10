import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-5xl font-bold">404</p>
      <h1 className="mt-3 text-xl font-semibold">
        That page is not on the map
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link may be out of date, or the destination may not be published
        yet.
      </p>
      <Link
        to="/destinations"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Browse destinations
      </Link>
    </div>
  )
}
