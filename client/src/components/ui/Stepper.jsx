import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

// Numbered progress steps: Submitted, Screened by admin, Checked by tourism officer.
// done: how many steps are complete.
export function Stepper({ steps, done, className }) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      {steps.map((step, index) => {
        const complete = index < done;
        return (
          <li key={step} className="flex items-center gap-2">
            {index > 0 && <span className="h-px w-6 bg-sage" aria-hidden="true" />}
            <span
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold',
                complete ? 'bg-forest text-white' : 'border border-sage bg-surface text-muted',
              )}
              aria-hidden="true"
            >
              {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn('text-[13px]', complete ? 'font-semibold text-charcoal' : 'text-muted')}
            >
              {step}
              <span className="sr-only">{complete ? ' (done)' : ' (not yet)'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
