import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { getDestination, recordView } from '@/api/destinations'
import { listReviews } from '@/api/reviews'
import { useAsync } from '@/lib/useAsync'
import { WorkflowBadge, ModerationBadge } from '@/components/StatusBadge'
import { Rating } from '@/components/Rating'
import { EmptyState } from '@/components/ListRow'
import { CONTENT_MODERATION } from '@/constants/status'
import { formatDate, formatFee } from '@/lib/utils'
import { NotFound } from './NotFound'

/** Label/value pairs as a definition list - a table of facts, not six cards. */
function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="divide-y border-y text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_1fr] gap-4 py-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function DestinationDetail() {
  const { id } = useParams()
  const destinationId = Number(id)

  const { data: d, loading } = useAsync(
    () => getDestination(destinationId),
    [destinationId],
  )
  const { data: reviews } = useAsync(
    () => listReviews(destinationId),
    [destinationId],
  )

  useEffect(() => {
    if (!Number.isNaN(destinationId)) void recordView(destinationId)
  }, [destinationId])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-72 animate-pulse bg-muted" />
        <div className="mt-6 h-8 w-1/2 animate-pulse bg-muted" />
      </div>
    )
  }
  if (!d) return <NotFound />

  const unverified = d.workflow_status === 'pending_endorsement'

  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <nav className="text-sm text-muted-foreground">
        <Link to="/destinations" className="hover:text-foreground">
          Destinations
        </Link>
        <span className="px-2">/</span>
        <span>{d.jurisdiction.name}</span>
      </nav>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          {d.name}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {d.location}
          <WorkflowBadge status={d.workflow_status} audience="public" />
        </p>
      </header>

      {unverified && (
        <p className="mt-6 border-l-2 border-sage py-2 pl-4 text-sm text-muted-foreground">
          This listing has passed spam screening but the tourism officer for{' '}
          {d.jurisdiction.name} has not yet checked it against the
          lesser-known criteria. Details may be incomplete.
        </p>
      )}

      {d.primary_image && (
        <img
          src={d.primary_image.image_url}
          alt={d.primary_image.caption}
          className="mt-8 aspect-[16/9] w-full object-cover"
        />
      )}

      {d.description && (
        <p className="mt-8 max-w-prose text-lg leading-relaxed">
          {d.description}
        </p>
      )}

      <section className="mt-10">
        <h2 className="sr-only">Visitor information</h2>
        <Facts
          items={[
            ['Municipality', `${d.jurisdiction.name}, ${d.jurisdiction.province}`],
            [
              'Category',
              d.categories.map((c) => c.category_name).join(', ') || 'Not set',
            ],
            ['Entrance fee', formatFee(d.entrance_fee)],
            ['Best time to visit', d.best_time_to_visit || 'Not specified'],
            ['Safety reminders', d.safety_reminders || 'None recorded'],
            [
              'Endorsed',
              d.endorsed_at ? formatDate(d.endorsed_at) : 'Not yet endorsed',
            ],
          ]}
        />
        <Link
          to={`/map?focus=${d.destination_id}`}
          className="mt-4 inline-block text-sm underline decoration-primary decoration-2 underline-offset-4"
        >
          View on map
        </Link>
      </section>

      {d.gallery.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Gallery</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {d.gallery.map((img) => (
              <figure key={img.image_id}>
                <img
                  src={img.image_url}
                  alt={img.caption}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {img.caption}
                  {!CONTENT_MODERATION[img.moderation_status].publiclyVisible ||
                  img.moderation_status === 'pending' ? (
                    <ModerationBadge status={img.moderation_status} />
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 border-t pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Reviews
            {d.average_rating !== null && (
              <span className="ml-3 font-normal text-muted-foreground">
                {d.average_rating} average from {d.review_count}
              </span>
            )}
          </h2>
          <Link
            to={`/destinations/${d.destination_id}/review`}
            className="text-sm underline decoration-primary decoration-2 underline-offset-4"
          >
            Write a review
          </Link>
        </div>

        {reviews && reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            hint="Nobody has written about this place on Sulyap. If you have been, you would be the first."
          />
        ) : (
          <ul className="mt-6 divide-y">
            {(reviews ?? []).map((r) => (
              <li key={r.review_id} className="py-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Rating value={r.rating} />
                  <span className="text-sm font-medium">
                    {r.author.full_name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(r.created_at)}
                  </span>
                  {r.moderation_status === 'pending' && (
                    <ModerationBadge status={r.moderation_status} />
                  )}
                </div>
                <p className="mt-2 text-muted-foreground">{r.review_text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  )
}
