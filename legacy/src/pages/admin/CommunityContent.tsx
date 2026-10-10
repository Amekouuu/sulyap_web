import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import type { ModerationStatus } from '@/types'
import {
  listCommunityContent,
  moderateContent,
  type ContentItem,
} from '@/api/admin'
import { CONTENT_MODERATION, MODERATION_FILTERS } from '@/constants/status'
import { useAsync } from '@/lib/useAsync'
import { PageHeader } from '@/components/PageHeader'
import { FilterTabs } from '@/components/FilterTabs'
import { ModerationBadge } from '@/components/StatusBadge'
import { Rating } from '@/components/Rating'
import {
  EmptyState,
  ListRow,
  ListRowSkeleton,
  ListRows,
} from '@/components/ListRow'
import { formatDate } from '@/lib/utils'

export function CommunityContent() {
  const [filter, setFilter] = useState<ModerationStatus | 'all'>('pending')
  const [nonce, setNonce] = useState(0)

  const { data, loading } = useAsync(
    () => listCommunityContent(filter === 'all' ? undefined : filter),
    [filter, nonce],
  )
  const rows = data ?? []

  async function act(item: ContentItem, next: ModerationStatus) {
    await moderateContent(item, next)
    setNonce((n) => n + 1)
  }

  return (
    <>
      <PageHeader
        title="Community Content"
        description="Reviews and photographs submitted by registered users. Content is visible while unverified and hidden only once removed."
      />

      <div className="mt-6">
        <FilterTabs
          label="Filter content by moderation status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            ...MODERATION_FILTERS.map((s) => ({
              value: s,
              label: CONTENT_MODERATION[s].label,
            })),
          ]}
        />
      </div>

      <div className="mt-2">
        {loading ? (
          <ListRows>
            {Array.from({ length: 3 }).map((_, i) => (
              <ListRowSkeleton key={i} />
            ))}
          </ListRows>
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing in this queue" />
        ) : (
          <ListRows>
            {rows.map((c) => (
              <ListRow
                key={`${c.kind}-${c.id}`}
                thumbnail={
                  c.image_url ? (
                    <img
                      src={c.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null
                }
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {c.kind}
                    </span>
                    <Link
                      to={`/destinations/${c.destination_id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {c.destination_name}
                    </Link>
                    {c.rating !== null && <Rating value={c.rating} />}
                  </span>
                }
                meta={`${c.author_name} · ${formatDate(c.created_at)}`}
                body={c.body}
                trailing={
                  <>
                    <ModerationBadge status={c.moderation_status} />
                    {/* removed is terminal, so it offers no actions at all */}
                    {CONTENT_MODERATION[c.moderation_status].editable && (
                      <span className="flex gap-1">
                        {c.moderation_status !== 'approved' && (
                          <button
                            onClick={() => act(c, 'approved')}
                            aria-label={`Approve ${c.kind}`}
                            className="border p-1.5 transition-colors hover:bg-muted"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          onClick={() => act(c, 'removed')}
                          aria-label={`Remove ${c.kind}`}
                          className="border p-1.5 text-destructive transition-colors hover:bg-muted"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </>
                }
              />
            ))}
          </ListRows>
        )}
      </div>
    </>
  )
}
