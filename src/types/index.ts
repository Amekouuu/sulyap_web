/*
  Entity types transcribed from the locked data model (paper Section 9, plus
  the additions recorded in the Change Manifest). Every ENUM here is the
  authoritative list - no component may invent a status string.
*/

export type UserRole = 'registered_user' | 'administrator' | 'tourism_officer'
export type AccountStatus = 'active' | 'suspended'
/** Administrator review of the user's submitted ID. Gates submission rights. */
export type AccountVerificationStatus = 'pending' | 'verified' | 'rejected'
export type JurisdictionType = 'province' | 'city' | 'municipality'

/** `draft` and `returned` are additions to the paper's original four states. */
export type DestinationWorkflowStatus =
  | 'draft'
  | 'pending_verification'
  | 'returned'
  | 'pending_endorsement'
  | 'endorsed'
  | 'rejected'

/** Reviews and images. `removed` is terminal and non-editable. */
export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'removed'

export type VerificationStatus = 'verified' | 'returned' | 'rejected'
export type EndorsementStatus = 'endorsed' | 'returned' | 'rejected'
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed'

/** Backs the 3-of-3 endorsement gate. Without this the rule is unenforceable. */
export type AssessmentStatus = 'not_assessed' | 'met' | 'not_met'

export interface Jurisdiction {
  jurisdiction_id: number
  name: string
  type: JurisdictionType
  province: string
}

export interface User {
  user_id: number
  full_name: string
  email: string
  contact_number: string
  /** Uploaded photo of a valid ID, reviewed by an administrator. */
  id_document_url: string | null
  account_verification_status: AccountVerificationStatus
  /** Registration address - the Nearby Lesser-Known feature depends on it. */
  home_address: string | null
  /** Geocoded from home_address via OpenStreetMap Nominatim. */
  address_coordinates: { lat: number; lng: number } | null
  role: UserRole
  /** Required for tourism_officer, null for every other role. */
  jurisdiction_id: number | null
  account_status: AccountStatus
  created_at: string
  updated_at: string
}

export interface Category {
  category_id: number
  category_name: string
  description: string
}

export interface ClassificationCriterion {
  criterion_id: number
  criterion_name: string
  description: string
}

export interface Destination {
  destination_id: number
  jurisdiction_id: number
  submitted_by: number
  name: string
  description: string
  location: string
  latitude: number
  longitude: number
  entrance_fee: number | null
  best_time_to_visit: string
  /**
   * Months the destination is at its best, recorded by the officer at
   * endorsement. Free-form by design - parsed in src/lib/months.ts.
   */
  active_months: string | null
  safety_reminders: string
  view_count: number
  workflow_status: DestinationWorkflowStatus
  last_edited_by: number | null
  previous_workflow_status: DestinationWorkflowStatus | null
  created_at: string
  updated_at: string
}

/** Junction: how this destination scored against each lesser-known criterion. */
export interface DestinationCriterion {
  destination_id: number
  criterion_id: number
  assessment_status: AssessmentStatus
  notes: string
  evidence: string
  /** Criterion 1 only - the observed Google Maps / TripAdvisor review count. */
  observed_review_count: number | null
  /** External counts drift, so the observation carries its own date. */
  observed_at: string | null
  assessed_by: number | null
  assessed_at: string | null
  /** The LTO's in-progress assessment. The 3-of-3 gate counts non-draft rows only. */
  is_draft: boolean
}

export interface DestinationCategory {
  destination_id: number
  category_id: number
}

export interface Review {
  review_id: number
  destination_id: number
  user_id: number
  rating: 1 | 2 | 3 | 4 | 5
  review_text: string
  moderation_status: ModerationStatus
  created_at: string
  updated_at: string
}

export interface DestinationImage {
  image_id: number
  destination_id: number
  user_id: number
  image_url: string
  caption: string
  moderation_status: ModerationStatus
  /** Exactly one per destination - the card thumbnail and detail-page hero. */
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface AdminVerificationLog {
  verification_id: number
  destination_id: number
  administrator_id: number
  verification_status: VerificationStatus
  remarks: string
  created_at: string
}

export interface EndorsementLog {
  endorsement_id: number
  destination_id: number
  tourism_officer_id: number
  endorsement_status: EndorsementStatus
  remarks: string
  created_at: string
}

export interface Report {
  report_id: number
  reported_by: number
  /** Exactly one of the three targets is non-null. */
  review_id: number | null
  image_id: number | null
  destination_id: number | null
  reason: string
  report_status: ReportStatus
  resolved_by: number | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

/** A destination joined with everything a list row or detail page needs. */
export interface DestinationView extends Destination {
  jurisdiction: Jurisdiction
  categories: Category[]
  primary_image: DestinationImage | null
  gallery: DestinationImage[]
  review_count: number
  average_rating: number | null
  /**
   * Derived, not stored: the created_at of the most recent Endorsement_Logs
   * row for this destination with status 'endorsed'. Keeping it on the log
   * rather than the destination means a re-endorsement after an edit
   * legitimately refreshes recency, because an officer had to re-review.
   */
  endorsed_at: string | null
}
