import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const CONTROL =
  'w-full rounded-ctl border bg-surface px-4 text-[15px] text-charcoal placeholder:text-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-forest/20 disabled:bg-cream disabled:text-muted';
const borderFor = (invalid) =>
  invalid ? 'border-pin focus:border-pin' : 'border-sage focus:border-forest';

// Label + control + hint + error, wired together for screen readers.
// children is a function that receives the props the control needs: ({ id, ...aria }) => <Input .../>
export function Field({ label, optional, required, hint, error, className, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-[14px] font-semibold text-charcoal">
          {label}
          {optional && <span className="font-normal text-muted"> (optional)</span>}
          {required && (
            <span className="text-pin" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
        invalid: Boolean(error),
      })}
      {hint && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-pin-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ invalid, className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(CONTROL, 'h-12', borderFor(invalid), className)} {...props} />
  );
});

export const Textarea = forwardRef(function Textarea(
  { invalid, className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(CONTROL, 'py-3 leading-relaxed', borderFor(invalid), className)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ invalid, className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(CONTROL, 'h-12 appearance-none pr-10', borderFor(invalid), className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </div>
  );
});

export function Checkbox({ label, description, className, ...props }) {
  return (
    <label
      className={cn('flex cursor-pointer items-start gap-3 text-[14px] text-charcoal', className)}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-sage accent-forest"
        {...props}
      />
      <span>
        {label}
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
    </label>
  );
}
