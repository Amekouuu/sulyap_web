import { cn } from '@/lib/cn';

export function Card({ as: Tag = 'div', className, ...props }) {
  return (
    <Tag
      className={cn('rounded-panel border border-sage/70 bg-surface shadow-card', className)}
      {...props}
    />
  );
}

// A titled block inside a card, separated by a hairline (mockup: "Basic Information", "Location").
export function CardSection({ title, action, className, children }) {
  return (
    <section className={cn('border-t border-sage/70 first:border-t-0', className)}>
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-sage/70 px-7 py-5">
          <h2 className="text-[20px] font-bold text-forest">{title}</h2>
          {action}
        </div>
      )}
      <div className="px-7 py-6">{children}</div>
    </section>
  );
}
