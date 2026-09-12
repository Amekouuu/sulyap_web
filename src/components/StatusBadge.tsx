import type {
  DestinationWorkflowStatus,
  ModerationStatus,
  ReportStatus,
} from '@/types'
import {
  CONTENT_MODERATION,
  DESTINATION_WORKFLOW,
  REPORT_STATUS,
  TONE_DOT,
  TONE_TEXT,
  type Tone,
} from '@/constants/status'
import { cn } from '@/lib/utils'

export type Audience = 'public' | 'submitter' | 'admin' | 'lto'

interface BaseProps {
  className?: string
}

/**
 * Status is information, not ornament, so it is set in type rather than
 * wrapped in a filled pill. The dot carries the colour; the label carries
 * the meaning. LGU-Endorsed is the single exception - it is the public
 * trust signal the whole endorsement workflow exists to produce, so it is
 * allowed a surface of its own.
 */
function Chip({
  label,
  tone,
  emphasis = false,
  className,
}: {
  label: string
  tone: Tone
  emphasis?: boolean
  className?: string
}) {
  if (emphasis) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm bg-primary px-2 py-1',
          'text-[11px] font-semibold uppercase tracking-wider text-primary-foreground',
          className,
        )}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider',
        TONE_TEXT[tone],
        className,
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[tone])}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}

export function WorkflowBadge({
  status,
  audience,
  className,
}: BaseProps & {
  status: DestinationWorkflowStatus
  audience: Audience
}) {
  const meta = DESTINATION_WORKFLOW[status]
  const label = meta.labels[audience]
  // A state this audience is never shown renders nothing at all.
  if (!label) return null

  return (
    <Chip
      label={label}
      tone={meta.tone}
      emphasis={status === 'endorsed' && audience === 'public'}
      className={className}
    />
  )
}

export function ModerationBadge({
  status,
  className,
}: BaseProps & { status: ModerationStatus }) {
  const meta = CONTENT_MODERATION[status]
  return <Chip label={meta.label} tone={meta.tone} className={className} />
}

export function ReportBadge({
  status,
  className,
}: BaseProps & { status: ReportStatus }) {
  const meta = REPORT_STATUS[status]
  return <Chip label={meta.label} tone={meta.tone} className={className} />
}
