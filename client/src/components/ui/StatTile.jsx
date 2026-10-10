import { cn } from '@/lib/cn';

const TONES = {
  forest: 'bg-forest text-white',
  gold: 'bg-gold text-charcoal',
  minty: 'bg-minty text-charcoal',
  terracotta: 'bg-terracotta text-white',
};

// Big colored number tile from the admin dashboard mockup.
export function StatTile({ tone = 'forest', icon: Icon, value, label, className }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-panel p-5 shadow-card',
        TONES[tone],
        className,
      )}
    >
      {Icon && (
        <>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-ctl bg-white text-charcoal">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <Icon
            className="pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 opacity-15"
            aria-hidden="true"
          />
        </>
      )}
      <p className="num mt-5 text-figure">{value}</p>
      <p className="mt-1 text-[15px] font-medium">{label}</p>
    </div>
  );
}
