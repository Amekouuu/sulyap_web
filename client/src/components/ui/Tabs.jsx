import { cn } from '@/lib/cn';

// Underlined filter buttons with counts (admin and officer lists in the mockup).
// They filter a list on the same page, so they are toggle buttons rather than ARIA tabs.
// tabs: [{ value, label, count }]
export function Tabs({ tabs, value, onChange, label = 'Filter', className }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex gap-7 overflow-x-auto border-b border-sage', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-3 pt-1 text-[15px] transition-colors',
              active
                ? 'border-forest font-semibold text-forest'
                : 'border-transparent text-muted hover:text-charcoal',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="num text-[12px] font-semibold">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
