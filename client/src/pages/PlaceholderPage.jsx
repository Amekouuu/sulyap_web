import { Hammer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/cn';

// Stand-in for pages built in a later phase, so every route and shell can be reviewed now.
// contained: add the page width and padding (public pages); admin and officer shells already pad.
export function PlaceholderPage({ title, phase, note, contained = true, showTitle = true }) {
  return (
    <div className={cn(contained && 'mx-auto max-w-page px-5 py-12 sm:px-8')}>
      {showTitle && (
        <h1 className="mb-8 text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
          {title}
        </h1>
      )}
      <Card>
        <EmptyState icon={Hammer} title={`Built in Phase ${phase}`}>
          {note}
        </EmptyState>
      </Card>
    </div>
  );
}
