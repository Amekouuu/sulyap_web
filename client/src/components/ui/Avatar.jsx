import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const SIZES = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-12 w-12 text-[15px]',
};

// Staff accounts use the filled forest style; registered users use the light style.
export function Avatar({ name, size = 'md', strong = false, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        strong ? 'bg-forest text-white' : 'border border-sage bg-cream text-forest',
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
