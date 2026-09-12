import type {
  DestinationCategory,
  DestinationCriterion,
  DestinationImage,
  Review,
} from '@/types'
import { placeholder, ts } from './helpers'

export const SEED_DESTINATION_CATEGORIES: DestinationCategory[] = [
  { destination_id: 1, category_id: 3 },
  { destination_id: 1, category_id: 4 },
  { destination_id: 2, category_id: 4 },
  { destination_id: 2, category_id: 3 },
  { destination_id: 3, category_id: 6 },
  { destination_id: 3, category_id: 3 },
  { destination_id: 4, category_id: 6 },
  { destination_id: 5, category_id: 2 },
  { destination_id: 6, category_id: 2 },
  { destination_id: 7, category_id: 3 },
]

export const SEED_IMAGES: DestinationImage[] = (
  [
    [1, 'Viewing deck at dawn', 190, true],
    [1, 'Egrets over the wetland', 150, false],
    [2, 'Boardwalk through the bakawan', 165, true],
    [2, 'Lookout at the river mouth', 200, false],
    [3, 'Lahar channel wall', 30, true],
    [4, 'North trailhead marker', 100, true],
    [5, 'Detached bell tower', 20, true],
    [6, 'Church facade', 15, true],
  ] as const
).map(([destination_id, caption, hue, is_primary], i) => ({
  image_id: i + 1,
  destination_id,
  user_id: 1,
  image_url: placeholder(caption, hue),
  caption,
  moderation_status: 'approved' as const,
  is_primary,
  created_at: ts('2026-08-01'),
  updated_at: ts('2026-08-01'),
}))

export const SEED_REVIEWS: Review[] = [
  {
    review_id: 1,
    destination_id: 1,
    user_id: 2,
    rating: 5,
    review_text:
      'Arrived just before sunrise and had the deck to ourselves. The cooperative collects the fee at a small hut on the access road.',
    moderation_status: 'approved',
    created_at: ts('2026-08-20'),
    updated_at: ts('2026-08-20'),
  },
  {
    review_id: 2,
    destination_id: 1,
    user_id: 3,
    rating: 4,
    review_text:
      'Worth the trip, but the road in was flooded and we had to walk the last stretch. Check the weather first.',
    moderation_status: 'pending',
    created_at: ts('2026-09-09'),
    updated_at: ts('2026-09-09'),
  },
  {
    review_id: 3,
    destination_id: 2,
    user_id: 1,
    rating: 5,
    review_text:
      'The boatman waited for us the whole time. Bring cash, there is nowhere to pay by card.',
    moderation_status: 'approved',
    created_at: ts('2026-09-04'),
    updated_at: ts('2026-09-04'),
  },
  {
    review_id: 4,
    destination_id: 1,
    user_id: 4,
    rating: 1,
    review_text: 'BEST DEALS ON TOUR PACKAGES CALL NOW 0917-000-0000',
    moderation_status: 'removed',
    created_at: ts('2026-09-07'),
    updated_at: ts('2026-09-08'),
  },
]

export const SEED_CRITERIA_ASSESSMENTS: DestinationCriterion[] = [
  {
    destination_id: 1,
    criterion_id: 1,
    assessment_status: 'met',
    notes: 'Single unnamed pin, two reviews attached.',
    evidence: 'Google Maps search "Candaba birding deck"',
    observed_review_count: 2,
    observed_at: '2026-08-12',
    assessed_by: 200,
    assessed_at: ts('2026-08-14'),
    is_draft: false,
  },
  {
    destination_id: 1,
    criterion_id: 2,
    assessment_status: 'met',
    notes: 'The wetlands appear in DOT material; this deck does not.',
    evidence: 'ACTOP Facebook page, DOT Region III listings',
    observed_review_count: null,
    observed_at: null,
    assessed_by: 200,
    assessed_at: ts('2026-08-14'),
    is_draft: false,
  },
  {
    destination_id: 1,
    criterion_id: 3,
    assessment_status: 'met',
    notes: 'No guidebook entry or CLTV36 segment found.',
    evidence: 'LOVE Pampanga archive search',
    observed_review_count: null,
    observed_at: null,
    assessed_by: 200,
    assessed_at: ts('2026-08-14'),
    is_draft: false,
  },
  {
    destination_id: 6,
    criterion_id: 3,
    assessment_status: 'not_met',
    notes:
      'Featured in LOVE Pampanga and in DOT heritage-church promotional material.',
    evidence: 'CLTV36 segment, DOT Region III brochure',
    observed_review_count: null,
    observed_at: null,
    assessed_by: 200,
    assessed_at: ts('2026-09-01'),
    is_draft: false,
  },
]
