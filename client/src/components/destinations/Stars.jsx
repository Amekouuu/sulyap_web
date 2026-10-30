import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

// Read-only star rating, 1 to 5.
export function Stars({ value, className = 'h-4 w-4' }) {
  const filled = Math.round(value);
  return (
    <span
      className="inline-flex gap-0.5 text-gold"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(className, n <= filled ? 'fill-current' : 'text-sage')}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
