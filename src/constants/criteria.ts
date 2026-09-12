import type { ClassificationCriterion } from '@/types'

/*
  The three lesser-known conditions from paper Section 6. All three must be
  recorded as MET before a destination can be endorsed.
*/
export const CLASSIFICATION_CRITERIA: ClassificationCriterion[] = [
  {
    criterion_id: 1,
    criterion_name: 'Absence from major review platforms',
    description:
      'Not listed on Google Maps or TripAdvisor, or listed with 5 or fewer user reviews.',
  },
  {
    criterion_id: 2,
    criterion_name: 'Absence from official promotional materials',
    description:
      'Not specifically mentioned by the ACTOP Facebook page, DOT Region III materials, or the municipal tourism office platform.',
  },
  {
    criterion_id: 3,
    criterion_name: 'Absence from mainstream travel media',
    description:
      'Not featured in guidebooks, DOT "Love the Philippines" content, the "LOVE Pampanga" segment on CLTV36, or commercial tour packages.',
  },
]

/** Criterion 1 qualifies at 5 or fewer reviews - paper Section 6 wins over the wireframe. */
export const CRITERION_1_REVIEW_THRESHOLD = 5

export const CRITERION_1_OPTIONS = [
  { value: 'not_listed', label: 'Not listed', qualifies: true },
  {
    value: 'listed_at_or_below',
    label: `Listed with ${CRITERION_1_REVIEW_THRESHOLD} or fewer reviews`,
    qualifies: true,
  },
  {
    value: 'listed_above',
    label: `Listed with more than ${CRITERION_1_REVIEW_THRESHOLD} reviews`,
    qualifies: false,
  },
] as const
