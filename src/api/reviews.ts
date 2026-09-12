import type { Review, User } from '@/types'
import { db } from '@/mocks/store'
import { CONTENT_MODERATION } from '@/constants/status'
import { respond } from './client'

export interface ReviewWithAuthor extends Review {
  author: Pick<User, 'user_id' | 'full_name'>
}

function withAuthor(r: Review): ReviewWithAuthor {
  const u = db.users.find((x) => x.user_id === r.user_id)
  return {
    ...r,
    author: {
      user_id: r.user_id,
      full_name: u?.full_name ?? 'Former member',
    },
  }
}

/** Public reads exclude removed content only - pending stays visible under post-moderation. */
export async function listReviews(
  destinationId: number,
): Promise<ReviewWithAuthor[]> {
  const rows = db.reviews
    .filter(
      (r) =>
        r.destination_id === destinationId &&
        CONTENT_MODERATION[r.moderation_status].publiclyVisible,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(withAuthor)
  return respond(rows)
}

export async function listMyReviews(
  userId: number,
): Promise<ReviewWithAuthor[]> {
  const rows = db.reviews
    .filter((r) => r.user_id === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(withAuthor)
  return respond(rows)
}
