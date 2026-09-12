import type { AdminVerificationLog, EndorsementLog, Report } from '@/types'
import { ts } from './helpers'

export const SEED_VERIFICATION_LOGS: AdminVerificationLog[] = [
  {
    verification_id: 1,
    destination_id: 1,
    administrator_id: 100,
    verification_status: 'verified',
    remarks: 'Photos match the described location.',
    created_at: ts('2026-08-01'),
  },
  {
    verification_id: 2,
    destination_id: 5,
    administrator_id: 100,
    verification_status: 'returned',
    remarks:
      'Submitted photos show the parish church interior, not the bell tower. Please upload photos of the tower itself.',
    created_at: ts('2026-09-09'),
  },
  {
    verification_id: 3,
    destination_id: 3,
    administrator_id: 100,
    verification_status: 'verified',
    remarks: 'Routed to the Porac tourism office.',
    created_at: ts('2026-09-08'),
  },
]

export const SEED_ENDORSEMENT_LOGS: EndorsementLog[] = [
  {
    endorsement_id: 1,
    destination_id: 1,
    tourism_officer_id: 200,
    endorsement_status: 'endorsed',
    remarks: 'All three criteria met. Cooperative confirmed the entrance fee.',
    created_at: ts('2026-08-14'),
  },
  {
    endorsement_id: 2,
    destination_id: 6,
    tourism_officer_id: 200,
    endorsement_status: 'rejected',
    remarks:
      'Criterion 3 not met - the church is featured in existing travel media.',
    created_at: ts('2026-09-01'),
  },
]

export const SEED_REPORTS: Report[] = [
  {
    report_id: 1042,
    reported_by: 2,
    review_id: 4,
    image_id: null,
    destination_id: null,
    reason: 'Spam - advertising an unrelated tour service.',
    report_status: 'resolved',
    resolved_by: 100,
    created_at: ts('2026-09-07'),
    updated_at: ts('2026-09-08'),
  },
  {
    report_id: 1043,
    reported_by: 3,
    review_id: null,
    image_id: null,
    destination_id: 3,
    reason: 'Coordinates point to the wrong side of the ridge.',
    report_status: 'pending',
    resolved_by: null,
    created_at: ts('2026-09-10'),
    updated_at: ts('2026-09-10'),
  },
  {
    report_id: 1044,
    reported_by: 200,
    review_id: null,
    image_id: null,
    destination_id: 4,
    reason: 'Duplicate of an existing Arayat trailhead listing.',
    report_status: 'under_review',
    resolved_by: null,
    created_at: ts('2026-09-11'),
    updated_at: ts('2026-09-11'),
  },
]
