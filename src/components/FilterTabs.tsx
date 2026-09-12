import { cn } from '@/lib/utils'

export interface FilterOption<T extends string> {
  value: T | 'all'
  label: string
  count?: number
}

/**
 * Underline tabs rather than a row of pills - the wireframes call for a
 * filter row, and an underline reads as navigation where a pill reads as
 * a badge. Keeps the badge vocabulary reserved for status.
 */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: FilterOption<T>[]
  value: T | 'all'
  onChange: (next: T | 'all') => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-5 overflow-x-auto border-b"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative -mb-px shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2.5 text-sm transition-colors',
              active
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className="ml-1.5 tabular-nums text-muted-foreground">
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
