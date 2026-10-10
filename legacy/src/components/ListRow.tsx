import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * The row that carries most of the list screens.
 *
 * Deliberately not a card: rows are separated by a hairline and by space,
 * so a list of twenty reads as one list rather than twenty floating objects.
 * The thumbnail is squared off - rounding it would make the row a card again.
 */
export function ListRow({
  to,
  thumbnail,
  title,
  meta,
  body,
  trailing,
  className,
}: {
  to?: string
  thumbnail?: ReactNode
  title: ReactNode
  /** Short supporting line - place, date, author. */
  meta?: ReactNode
  body?: ReactNode
  /** Status and actions, right-aligned on wide screens. */
  trailing?: ReactNode
  className?: string
}) {
  const inner = (
    <div
      className={cn(
        'grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 py-5',
        'sm:grid-cols-[auto_1fr_auto] sm:items-start',
        className,
      )}
    >
      {thumbnail ? (
        <div className="h-16 w-24 shrink-0 overflow-hidden bg-muted sm:h-20 sm:w-28">
          {thumbnail}
        </div>
      ) : (
        <div className="hidden" />
      )}

      <div className="min-w-0">
        <p className="font-medium leading-snug">{title}</p>
        {meta && (
          <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p>
        )}
        {body && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {body}
          </p>
        )}
      </div>

      {trailing && (
        <div className="col-start-2 flex items-center gap-3 sm:col-start-3 sm:flex-col sm:items-end sm:gap-2">
          {trailing}
        </div>
      )}
    </div>
  )

  if (!to) return inner

  return (
    <Link
      to={to}
      className="block transition-colors hover:bg-muted/40 focus-visible:bg-muted/40"
    >
      {inner}
    </Link>
  )
}

/** Wraps rows and draws the hairlines between them. */
export function ListRows({ children }: { children: ReactNode }) {
  return <div className="divide-y">{children}</div>
}

export function EmptyState({
  title,
  hint,
}: {
  title: string
  hint?: string
}) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

/** Matches ListRow's shape so lists do not jump when data arrives. */
export function ListRowSkeleton() {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 py-5">
      <div className="h-16 w-24 animate-pulse bg-muted sm:h-20 sm:w-28" />
      <div className="space-y-2 pt-1">
        <div className="h-4 w-2/5 animate-pulse bg-muted" />
        <div className="h-3 w-1/4 animate-pulse bg-muted" />
        <div className="h-3 w-3/4 animate-pulse bg-muted" />
      </div>
    </div>
  )
}
