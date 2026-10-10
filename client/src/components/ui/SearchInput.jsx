import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SearchInput({ label = 'Search', className, ...props }) {
  return (
    <label className={cn('relative block', className)}>
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        className="h-12 w-full rounded-ctl border border-sage bg-surface pl-11 pr-4 text-[15px] placeholder:text-muted focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
        {...props}
      />
    </label>
  );
}
