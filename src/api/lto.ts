import type {
  AssessmentStatus,
  DestinationCriterion,
  EndorsementStatus,
} from '@/types'
import { db, nextId, nowIso, persist } from '@/mocks/store'
import { CLASSIFICATION_CRITERIA } from '@/constants/criteria'
import { respond } from './client'

/** One criterion joined with its definition, for the checklist UI. */
export interface CriterionAssessment {
  criterion_id: number
  criterion_name: string
  description: string
  assessment_status: AssessmentStatus
  notes: string
  evidence: string
  observed_review_count: number | null
  observed_at: string | null
  is_draft: boolean
}

/**
 * Returns all three criteria for a destination, filling in blanks for any
 * the officer has not touched yet - the checklist always shows three rows.
 */
export async function getAssessment(
  destinationId: number,
): Promise<CriterionAssessment[]> {
  const rows = CLASSIFICATION_CRITERIA.map((c) => {
    const saved = db.criteriaAssessments.find(
      (a) => a.destination_id === destinationId && a.criterion_id === c.criterion_id,
    )
    return {
      criterion_id: c.criterion_id,
      criterion_name: c.criterion_name,
      description: c.description,
      assessment_status: saved?.assessment_status ?? 'not_assessed',
      notes: saved?.notes ?? '',
      evidence: saved?.evidence ?? '',
      observed_review_count: saved?.observed_review_count ?? null,
      observed_at: saved?.observed_at ?? null,
      is_draft: saved?.is_draft ?? true,
    }
  })
  return respond(rows)
}

/**
 * Saves the officer's assessment. `draft` keeps it out of the endorsement
 * gate - only non-draft MET assertions count toward the three-criteria rule,
 * so an officer can step away mid-check without accidentally qualifying a
 * destination.
 */
export async function saveAssessment(opts: {
  destinationId: number
  officerId: number
  rows: CriterionAssessment[]
  draft: boolean
}): Promise<void> {
  for (const r of opts.rows) {
    const existing = db.criteriaAssessments.find(
      (a) =>
        a.destination_id === opts.destinationId &&
        a.criterion_id === r.criterion_id,
    )
    const next: DestinationCriterion = {
      destination_id: opts.destinationId,
      criterion_id: r.criterion_id,
      assessment_status: r.assessment_status,
      notes: r.notes,
      evidence: r.evidence,
      observed_review_count: r.observed_review_count,
      observed_at: r.observed_at,
      assessed_by: opts.officerId,
      assessed_at: nowIso(),
      is_draft: opts.draft,
    }
    if (existing) Object.assign(existing, next)
    else db.criteriaAssessments.push(next)
  }
  persist()
}

/** How many criteria are recorded as met and submitted, out of three. */
export function metCount(rows: CriterionAssessment[]): number {
  return rows.filter((r) => r.assessment_status === 'met').length
}

/** The endorsement gate: all three met, per the classification criteria. */
export function canEndorse(rows: CriterionAssessment[]): boolean {
  return rows.length === 3 && rows.every((r) => r.assessment_status === 'met')
}

/**
 * Records the officer's decision and moves the destination.
 * A return routes straight to the submitter - they hold the only edit right.
 */
export async function decideEndorsement(opts: {
  destinationId: number
  officerId: number
  decision: EndorsementStatus
  remarks: string
}): Promise<void> {
  const d = db.destinations.find(
    (x) => x.destination_id === opts.destinationId,
  )
  if (!d) return

  d.previous_workflow_status = d.workflow_status
  d.workflow_status =
    opts.decision === 'endorsed'
      ? 'endorsed'
      : opts.decision === 'returned'
        ? 'returned'
        : 'rejected'
  d.updated_at = nowIso()

  db.endorsementLogs.push({
    endorsement_id: nextId(db.endorsementLogs, 'endorsement_id'),
    destination_id: opts.destinationId,
    tourism_officer_id: opts.officerId,
    endorsement_status: opts.decision,
    remarks: opts.remarks,
    created_at: nowIso(),
  })

  // Endorsing finalises the assessment - it can no longer be a draft.
  if (opts.decision === 'endorsed') {
    for (const a of db.criteriaAssessments) {
      if (a.destination_id === opts.destinationId) a.is_draft = false
    }
  }
  persist()
}
