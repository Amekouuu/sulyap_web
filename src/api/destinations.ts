import type {
  Destination,
  DestinationView,
  DestinationWorkflowStatus,
} from '@/types'
import { db, nowIso, persist } from '@/mocks/store'
import { CATEGORY_BY_ID } from '@/constants/categories'
import { JURISDICTION_BY_ID } from '@/constants/jurisdictions'
import { CONTENT_MODERATION, PUBLICLY_VISIBLE_STATUSES } from '@/constants/status'
import { respond } from './client'

/** Join a destination row with everything a card or detail page needs. */
function toView(d: Destination): DestinationView {
  const images = db.images.filter(
    (i) =>
      i.destination_id === d.destination_id &&
      CONTENT_MODERATION[i.moderation_status].publiclyVisible,
  )
  const reviews = db.reviews.filter(
    (r) =>
      r.destination_id === d.destination_id &&
      CONTENT_MODERATION[r.moderation_status].publiclyVisible,
  )
  const ratings = reviews.map((r) => r.rating)

  return {
    ...d,
    jurisdiction: JURISDICTION_BY_ID.get(d.jurisdiction_id)!,
    categories: db.destinationCategories
      .filter((dc) => dc.destination_id === d.destination_id)
      .map((dc) => CATEGORY_BY_ID.get(dc.category_id)!)
      .filter(Boolean),
    primary_image: images.find((i) => i.is_primary) ?? images[0] ?? null,
    gallery: images.filter((i) => !i.is_primary),
    review_count: reviews.length,
    average_rating: ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : null,
  }
}

export interface BrowseParams {
  query?: string
  categoryIds?: number[]
  jurisdictionId?: number
  /** Browsing uses inverted engagement; searching uses relevance. */
  sort?: 'least_explored' | 'recent' | 'relevance'
}

/**
 * Inverted-engagement score. Lower engagement ranks higher.
 * Weights are provisional and flagged for approval (manifest D10).
 */
function leastExploredScore(d: DestinationView): number {
  const engagement = d.view_count + d.review_count * 5
  const inverse = 1 / (1 + engagement)
  const recency = d.endorsed_at
    ? 1 / (1 + (Date.now() - Date.parse(d.endorsed_at)) / 86_400_000)
    : 1
  return inverse * 0.7 + recency * 0.3
}

export async function browseDestinations(
  params: BrowseParams = {},
): Promise<DestinationView[]> {
  const { query = '', categoryIds = [], jurisdictionId, sort } = params

  let rows = db.destinations
    .filter((d) =>
      PUBLICLY_VISIBLE_STATUSES.includes(
        d.workflow_status as DestinationWorkflowStatus,
      ),
    )
    .map(toView)

  if (jurisdictionId) {
    rows = rows.filter((d) => d.jurisdiction_id === jurisdictionId)
  }
  if (categoryIds.length) {
    rows = rows.filter((d) =>
      d.categories.some((c) => categoryIds.includes(c.category_id)),
    )
  }

  const q = query.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    )
  }

  // Search defaults to relevance; browsing defaults to least explored.
  const mode = sort ?? (q ? 'relevance' : 'least_explored')
  if (mode === 'least_explored') {
    rows.sort((a, b) => leastExploredScore(b) - leastExploredScore(a))
  } else if (mode === 'recent') {
    rows.sort((a, b) => (b.endorsed_at ?? '').localeCompare(a.endorsed_at ?? ''))
  } else {
    rows.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1
      return aStarts - bStarts || a.name.localeCompare(b.name)
    })
  }

  return respond(rows)
}

export async function getDestination(
  id: number,
): Promise<DestinationView | null> {
  const row = db.destinations.find((d) => d.destination_id === id)
  return respond(row ? toView(row) : null)
}

/** One view per destination per session - refreshing must not inflate the count. */
const viewed = new Set<number>()

export async function recordView(id: number): Promise<void> {
  if (viewed.has(id)) return
  viewed.add(id)
  const row = db.destinations.find((d) => d.destination_id === id)
  if (row) {
    row.view_count += 1
    row.updated_at = nowIso()
    persist()
  }
}

/** Destinations submitted by one user, in any state including drafts. */
export async function listMyNominations(
  userId: number,
): Promise<DestinationView[]> {
  const rows = db.destinations
    .filter((d) => d.submitted_by === userId)
    .map(toView)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return respond(rows)
}

/** Admin and LTO queues. Jurisdiction scoping is the LTO visibility rule. */
export async function listForReview(opts: {
  statuses: DestinationWorkflowStatus[]
  jurisdictionId?: number
}): Promise<DestinationView[]> {
  const rows = db.destinations
    .filter((d) => opts.statuses.includes(d.workflow_status))
    .filter((d) =>
      opts.jurisdictionId ? d.jurisdiction_id === opts.jurisdictionId : true,
    )
    .map(toView)
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
  return respond(rows)
}
