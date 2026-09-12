import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { browseDestinations } from '@/api/destinations'
import { CATEGORIES } from '@/constants/categories'
import { JURISDICTIONS } from '@/constants/jurisdictions'
import { useAsync, useDebounced } from '@/lib/useAsync'
import { SearchInput } from '@/components/SearchInput'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { WorkflowBadge } from '@/components/StatusBadge'
import { formatFee, cn } from '@/lib/utils'

export function Destinations() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [jurisdictionId, setJurisdictionId] = useState<number | undefined>()
  const debounced = useDebounced(query)

  const { data, loading } = useAsync(
    () => browseDestinations({ query: debounced, categoryIds, jurisdictionId }),
    [debounced, categoryIds.join(','), jurisdictionId],
  )

  const rows = data ?? []
  // Searching ranks by relevance; browsing ranks by inverted engagement.
  const ordering = debounced.trim() ? 'Best match' : 'Least explored first'

  function toggleCategory(id: number) {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Destinations
      </h1>

      <div className="mt-8 max-w-md">
        <SearchInput
          value={query}
          onChange={(next) => {
            setQuery(next)
            setParams(next ? { q: next } : {}, { replace: true })
          }}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-b pb-5 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {CATEGORIES.map((c) => {
            const active = categoryIds.includes(c.category_id)
            return (
              <button
                key={c.category_id}
                onClick={() => toggleCategory(c.category_id)}
                aria-pressed={active}
                className={cn(
                  'underline-offset-4 transition-colors hover:text-foreground',
                  active
                    ? 'font-medium text-foreground underline decoration-primary decoration-2'
                    : 'text-muted-foreground',
                )}
              >
                {c.category_name}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="lgu" className="text-muted-foreground">
            Municipality
          </label>
          <select
            id="lgu"
            value={jurisdictionId ?? ''}
            onChange={(e) =>
              setJurisdictionId(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            className="border-b bg-transparent py-1 outline-none focus:border-primary"
          >
            <option value="">All</option>
            {JURISDICTIONS.map((j) => (
              <option key={j.jurisdiction_id} value={j.jurisdiction_id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {loading ? 'Searching' : `${rows.length} shown`} &middot; {ordering}
      </p>

      <div className="mt-2">
        {loading ? (
          <ListRows>
            {Array.from({ length: 4 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </ListRows>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing matches those filters"
            hint="Try removing a category, or widening the municipality to All."
          />
        ) : (
          <ListRows>
            {rows.map((d) => (
              <ListRow
                key={d.destination_id}
                to={`/destinations/${d.destination_id}`}
                thumbnail={
                  d.primary_image ? (
                    <img
                      src={d.primary_image.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null
                }
                title={d.name}
                meta={`${d.jurisdiction.name} · ${formatFee(d.entrance_fee)}`}
                body={d.description}
                trailing={
                  <>
                    <WorkflowBadge
                      status={d.workflow_status}
                      audience="public"
                    />
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {d.review_count
                        ? `${d.average_rating} · ${d.review_count} reviews`
                        : 'No reviews yet'}
                    </span>
                  </>
                }
              />
            ))}
          </ListRows>
        )}
      </div>
    </div>
  )
}
