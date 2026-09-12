import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Rating({
  value,
  size = 'sm',
}: {
  value: number
  size?: 'sm' | 'md'
}) {
  const px = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn(
            px,
            i <= Math.round(value)
              ? 'fill-accent text-accent'
              : 'text-muted-foreground/35',
          )}
        />
      ))}
    </span>
  )
}
