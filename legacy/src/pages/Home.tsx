import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { browseDestinations } from '@/api/destinations'
import { useAsync } from '@/lib/useAsync'
import { SearchInput } from '@/components/SearchInput'
import { WorkflowBadge } from '@/components/StatusBadge'
import { formatFee } from '@/lib/utils'

/*
  Not a hero-plus-three-cards page.

  The ranking is the product, so the front page shows the ranking itself as
  a numbered index - numbering is honest here because the order carries real
  information. Below it, one short band explains what LGU-endorsed means,
  since that is the distinction the whole workflow exists to produce.
*/
export function Home() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { data, loading } = useAsync(
    () => browseDestinations({ sort: 'least_explored' }),
    [],
  )
  const leastExplored = (data ?? []).slice(0, 5)

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Pampanga has more than
            <br />
            the places you already know.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Sulyap lists destinations that have not been written up, promoted,
            or reviewed much yet. The least visited are shown first, on
            purpose.
          </p>

          <form
            className="mt-10 max-w-md"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(
                `/destinations${query ? `?q=${encodeURIComponent(query)}` : ''}`,
              )
            }}
          >
            <SearchInput value={query} onChange={setQuery} />
          </form>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold">Least explored right now</h2>
            <Link
              to="/destinations"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              All destinations
            </Link>
          </div>

          <ol className="mt-8 divide-y">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex gap-6 py-6">
                  <div className="h-5 w-6 animate-pulse bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/3 animate-pulse bg-muted" />
                    <div className="h-4 w-1/4 animate-pulse bg-muted" />
                  </div>
                </li>
              ))}

            {leastExplored.map((d, i) => (
              <li key={d.destination_id}>
                <Link
                  to={`/destinations/${d.destination_id}`}
                  className="group grid grid-cols-[2rem_1fr] items-baseline gap-x-5 gap-y-1 py-6 sm:grid-cols-[2rem_1fr_auto]"
                >
                  <span className="font-display text-lg tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-lg font-medium decoration-1 underline-offset-4 group-hover:underline">
                      {d.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {d.jurisdiction.name} &middot;{' '}
                      {d.categories.map((c) => c.category_name).join(', ') ||
                        'Uncategorised'}{' '}
                      &middot; {formatFee(d.entrance_fee)}
                    </p>
                  </div>

                  <div className="col-start-2 flex items-center gap-4 sm:col-start-3 sm:justify-end">
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {d.view_count} views
                    </span>
                    <WorkflowBadge
                      status={d.workflow_status}
                      audience="public"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1fr_1.4fr]">
          <h2 className="text-xl font-semibold">
            What LGU-endorsed
            <br className="hidden md:block" /> actually means
          </h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              A destination carries the endorsement only after the tourism
              officer for that municipality has checked it against three
              conditions: it is absent or barely reviewed on Google Maps and
              TripAdvisor, absent from official promotional material, and
              absent from travel media.
            </p>
            <p>
              Listings marked{' '}
              <span className="font-medium text-foreground">Unverified</span>{' '}
              have passed spam screening but are still waiting on that check.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
