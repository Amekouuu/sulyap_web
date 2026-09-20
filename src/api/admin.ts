import type {
  AdminVerificationLog,
  DestinationImage,
  EndorsementLog,
  ModerationStatus,
  Review,
} from '@/types'
import { db, nextId, nowIso, persist } from '@/mocks/store'
import { JURISDICTION_BY_ID } from '@/constants/jurisdictions'
import { respond } from './client'

/** A review or image, flattened so one moderation queue can show both. */
export interface ContentItem {
  kind: 'review' | 'image'
  id: number
  destination_id: number
  destination_name: string
  author_name: string
  moderation_status: ModerationStatus
  /** Review text, or image caption. */
  body: string
  image_url: string | null
  rating: number | null
  created_at: string
}

function nameOf(userId: number): string {
  return db.users.find((u) => u.user_id === userId)?.full_name ?? 'Former member'
}

function destName(id: number): string {
  return (
    db.destinations.find((d) => d.destination_id === id)?.name ??
    'Removed destination'
  )
}

function fromReview(r: Review): ContentItem {
  return {
    kind: 'review',
    id: r.review_id,
    destination_id: r.destination_id,
    destination_name: destName(r.destination_id),
    author_name: nameOf(r.user_id),
    moderation_status: r.moderation_status,
    body: r.review_text,
    image_url: null,
    rating: r.rating,
    created_at: r.created_at,
  }
}

function fromImage(i: DestinationImage): ContentItem {
  return {
    kind: 'image',
    id: i.image_id,
    destination_id: i.destination_id,
    destination_name: destName(i.destination_id),
    author_name: nameOf(i.user_id),
    moderation_status: i.moderation_status,
    body: i.caption,
    image_url: i.image_url,
    rating: null,
    created_at: i.created_at,
  }
}

export async function listCommunityContent(
  status?: ModerationStatus,
): Promise<ContentItem[]> {
  const rows = [...db.reviews.map(fromReview), ...db.images.map(fromImage)]
    .filter((c) => (status ? c.moderation_status === status : true))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  return respond(rows)
}

/**
 * `removed` is terminal. Nothing may transition out of it, which is what
 * stops removed content being edited back into public view.
 */
export async function moderateContent(
  item: Pick<ContentItem, 'kind' | 'id'>,
  next: ModerationStatus,
): Promise<void> {
  const row =
    item.kind === 'review'
      ? db.reviews.find((r) => r.review_id === item.id)
      : db.images.find((i) => i.image_id === item.id)
  if (!row || row.moderation_status === 'removed') return
  row.moderation_status = next
  row.updated_at = nowIso()
  persist()
}

export interface LogEntry {
  id: number
  kind: 'verification' | 'endorsement'
  destination_id: number
  destination_name: string
  jurisdiction: string
  actor_name: string
  status: string
  remarks: string
  created_at: string
}

function verificationEntry(l: AdminVerificationLog): LogEntry {
  const d = db.destinations.find((x) => x.destination_id === l.destination_id)
  return {
    id: l.verification_id,
    kind: 'verification',
    destination_id: l.destination_id,
    destination_name: destName(l.destination_id),
    jurisdiction: d
      ? (JURISDICTION_BY_ID.get(d.jurisdiction_id)?.name ?? '')
      : '',
    actor_name: nameOf(l.administrator_id),
    status: l.verification_status,
    remarks: l.remarks,
    created_at: l.created_at,
  }
}

function endorsementEntry(l: EndorsementLog): LogEntry {
  const d = db.destinations.find((x) => x.destination_id === l.destination_id)
  return {
    id: l.endorsement_id,
    kind: 'endorsement',
    destination_id: l.destination_id,
    destination_name: destName(l.destination_id),
    jurisdiction: d
      ? (JURISDICTION_BY_ID.get(d.jurisdiction_id)?.name ?? '')
      : '',
    actor_name: nameOf(l.tourism_officer_id),
    status: l.endorsement_status,
    remarks: l.remarks,
    created_at: l.created_at,
  }
}

/** Read-only audit trail - both log tables, newest first. */
export async function listScreeningLog(): Promise<LogEntry[]> {
  const rows = [
    ...db.verificationLogs.map(verificationEntry),
    ...db.endorsementLogs.map(endorsementEntry),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return respond(rows)
}

export type ScreeningDecision = 'verified' | 'returned' | 'rejected'

/**
 * The administrator's screening decision on a nomination.
 *
 * Writes the workflow transition and the audit log in one action - a
 * decision with no record of who made it or why is not auditable, and the
 * submitter needs the remarks to know what to fix.
 *
 * Nothing here touches destination content: the administrator may route a
 * submission but never edit it.
 */
export async function screenDestination(opts: {
  destinationId: number
  administratorId: number
  decision: ScreeningDecision
  remarks: string
}): Promise<void> {
  const d = db.destinations.find(
    (x) => x.destination_id === opts.destinationId,
  )
  if (!d) return

  const next =
    opts.decision === 'verified'
      ? 'pending_endorsement'
      : opts.decision === 'returned'
        ? 'returned'
        : 'rejected'

  d.previous_workflow_status = d.workflow_status
  d.workflow_status = next
  d.updated_at = nowIso()

  db.verificationLogs.push({
    verification_id: nextId(db.verificationLogs, 'verification_id'),
    destination_id: opts.destinationId,
    administrator_id: opts.administratorId,
    verification_status: opts.decision,
    remarks: opts.remarks,
    created_at: nowIso(),
  })
  persist()
}

/** Reopens a rejected nomination so the submitter can correct it. */
export async function reopenRejected(opts: {
  destinationId: number
  administratorId: number
  remarks: string
}): Promise<void> {
  const d = db.destinations.find(
    (x) => x.destination_id === opts.destinationId,
  )
  if (!d || d.workflow_status !== 'rejected') return

  d.previous_workflow_status = 'rejected'
  d.workflow_status = 'returned'
  d.updated_at = nowIso()

  db.verificationLogs.push({
    verification_id: nextId(db.verificationLogs, 'verification_id'),
    destination_id: opts.destinationId,
    administrator_id: opts.administratorId,
    verification_status: 'returned',
    remarks: opts.remarks,
    created_at: nowIso(),
  })
  persist()
}

export interface EndorsementProgress {
  destination_id: number
  destination_name: string
  jurisdiction: string
  /** Null until an administrator has screened it through to the officer. */
  officer_name: string | null
  stage: 'awaiting_screening' | 'under_review' | 'endorsed' | 'rejected' | 'returned'
  criteria_met: number
  criteria_total: number
  last_activity: string
  remarks: string
}

/**
 * Read-only oversight of endorsement progress across every jurisdiction.
 *
 * Deliberately has no actions: an administrator may watch an endorsement
 * but not overturn it. The officer's decision within their own jurisdiction
 * is the final word.
 */
export async function listEndorsementProgress(): Promise<EndorsementProgress[]> {
  const rows: EndorsementProgress[] = db.destinations
    .filter((d) => d.workflow_status !== 'draft')
    .map((d) => {
      const assessments = db.criteriaAssessments.filter(
        (a) => a.destination_id === d.destination_id,
      )
      const criteria_met = assessments.filter(
        (a) => a.assessment_status === 'met',
      ).length

      const lastLog = db.endorsementLogs
        .filter((l) => l.destination_id === d.destination_id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .pop()

      // The officer is whoever holds this jurisdiction - routing is automatic,
      // so a screened submission always has one.
      const officer =
        d.workflow_status === 'pending_verification'
          ? null
          : (db.users.find(
              (u) =>
                u.role === 'tourism_officer' &&
                u.jurisdiction_id === d.jurisdiction_id,
            ) ?? null)

      const stage: EndorsementProgress['stage'] =
        d.workflow_status === 'pending_verification'
          ? 'awaiting_screening'
          : d.workflow_status === 'pending_endorsement'
            ? 'under_review'
            : d.workflow_status === 'endorsed'
              ? 'endorsed'
              : d.workflow_status === 'rejected'
                ? 'rejected'
                : 'returned'

      return {
        destination_id: d.destination_id,
        destination_name: d.name,
        jurisdiction: JURISDICTION_BY_ID.get(d.jurisdiction_id)?.name ?? '',
        officer_name: officer?.full_name ?? null,
        stage,
        criteria_met,
        criteria_total: 3,
        last_activity: lastLog?.created_at ?? d.updated_at,
        remarks: lastLog?.remarks ?? '',
      }
    })
    .sort((a, b) => b.last_activity.localeCompare(a.last_activity))

  return respond(rows)
}
