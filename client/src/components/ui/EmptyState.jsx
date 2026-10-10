import { cn } from '@/lib/cn';

export function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      {Icon && (
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-minty-50 text-forest">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <h2 className="text-[18px] font-bold text-charcoal">{title}</h2>
      {children && (
        <div className="mt-2 max-w-md text-[14px] leading-relaxed text-muted">{children}</div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
