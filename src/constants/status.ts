/*
  The single source of truth for every status chip, filter tab, and
  status-dependent button in the app. Nothing may hardcode a status label.

  Each entry carries the four audience labels (paper Section 13 label map),
  a visual tone, whether the state is publicly visible, and whether the
  submitter may edit in that state.
*/

import type {
  DestinationWorkflowStatus,
  ModerationStatus,
  ReportStatus,
} from '@/types'

export type Tone = 'neutral' | 'pending' | 'positive' | 'attention' | 'closed'

/**
 * Tone maps to a text colour and a dot, not a filled pill.
 * Status is information, so it is set in type - only the endorsed state,
 * which is the one public trust signal, gets a surface of its own.
 */
export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-muted-foreground',
  pending: 'text-lahar',
  positive: 'text-secondary',
  attention: 'text-destructive',
  closed: 'text-muted-foreground',
}

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-muted-foreground/40',
  pending: 'bg-lahar',
  positive: 'bg-secondary',
  attention: 'bg-destructive',
  closed: 'bg-muted-foreground/30',
}

export interface WorkflowMeta {
  /** null means the state is not shown to that audience at all. */
  labels: {
    public: string | null
    submitter: string
    admin: string | null
    lto: string | null
  }
  tone: Tone
  /** D-01, reading (iii): browsable from pending_endorsement onward. */
  publiclyVisible: boolean
  /** D-02: submitter edit rights, scoped by state. */
  submitterCanEdit: boolean
  /** Shown beside the Edit control when editing carries a consequence. */
  editWarning: string | null
}

export const DESTINATION_WORKFLOW: Record<
  DestinationWorkflowStatus,
  WorkflowMeta
> = {
  draft: {
    labels: { public: null, submitter: 'Draft', admin: null, lto: null },
    tone: 'neutral',
    publiclyVisible: false,
    submitterCanEdit: true,
    editWarning: null,
  },
  pending_verification: {
    labels: {
      public: null,
      submitter: 'Under Review',
      admin: 'Pending Screening',
      lto: null,
    },
    tone: 'pending',
    publiclyVisible: false,
    submitterCanEdit: true,
    editWarning: null,
  },
  returned: {
    labels: {
      public: null,
      submitter: 'Needs Changes',
      admin: 'Returned',
      lto: 'Returned',
    },
    tone: 'attention',
    publiclyVisible: false,
    submitterCanEdit: true,
    editWarning: null,
  },
  pending_endorsement: {
    labels: {
      public: 'Unverified',
      submitter: 'Awaiting LGU',
      admin: 'Screened',
      lto: 'Pending',
    },
    tone: 'pending',
    publiclyVisible: true,
    // The LTO is assessing this exact version - it must not change mid-review.
    submitterCanEdit: false,
    editWarning: null,
  },
  endorsed: {
    labels: {
      public: 'LGU-Endorsed',
      submitter: 'Endorsed',
      admin: 'Endorsed',
      lto: 'Endorsed',
    },
    tone: 'positive',
    publiclyVisible: true,
    submitterCanEdit: true,
    editWarning:
      'Editing will withdraw the LGU endorsement and send this back to the tourism officer for review.',
  },
  rejected: {
    labels: {
      public: null,
      submitter: 'Not Accepted',
      admin: 'Rejected',
      lto: 'Rejected',
    },
    tone: 'closed',
    publiclyVisible: false,
    // Recoverable only through the admin reopen (D-05), never by direct edit.
    submitterCanEdit: false,
    editWarning: null,
  },
}

export interface ModerationMeta {
  label: string
  tone: Tone
  /** Under post-moderation (D1) content is visible unless removed. */
  publiclyVisible: boolean
  /** D8 reverts edits to pending - except `removed`, which is terminal. */
  editable: boolean
}

export const CONTENT_MODERATION: Record<ModerationStatus, ModerationMeta> = {
  pending: {
    label: 'Unverified',
    tone: 'pending',
    publiclyVisible: true,
    editable: true,
  },
  approved: {
    label: 'Approved',
    tone: 'positive',
    publiclyVisible: true,
    editable: true,
  },
  flagged: {
    label: 'Flagged',
    tone: 'attention',
    publiclyVisible: true,
    editable: true,
  },
  removed: {
    label: 'Removed',
    tone: 'closed',
    publiclyVisible: false,
    // Terminal. Editing a removed item back into view is the bypass this closes.
    editable: false,
  },
}

export const REPORT_STATUS: Record<ReportStatus, { label: string; tone: Tone }> =
  {
    pending: { label: 'Pending', tone: 'pending' },
    under_review: { label: 'Under Review', tone: 'attention' },
    resolved: { label: 'Resolved', tone: 'positive' },
    dismissed: { label: 'Dismissed', tone: 'neutral' },
  }

/** Filter tab sets, derived so a new state can never be missed off a filter. */
export const ADMIN_DESTINATION_FILTERS: DestinationWorkflowStatus[] = [
  'pending_verification',
  'returned',
  'pending_endorsement',
  'endorsed',
  'rejected',
]

export const LTO_SUBMISSION_FILTERS: DestinationWorkflowStatus[] = [
  'pending_endorsement',
  'endorsed',
  'returned',
  'rejected',
]

export const MODERATION_FILTERS: ModerationStatus[] = [
  'pending',
  'approved',
  'flagged',
  'removed',
]

export const REPORT_FILTERS: ReportStatus[] = [
  'pending',
  'under_review',
  'resolved',
  'dismissed',
]

/** States a visitor may see. Every public query filters on this. */
export const PUBLICLY_VISIBLE_STATUSES = (
  Object.keys(DESTINATION_WORKFLOW) as DestinationWorkflowStatus[]
).filter((s) => DESTINATION_WORKFLOW[s].publiclyVisible)
