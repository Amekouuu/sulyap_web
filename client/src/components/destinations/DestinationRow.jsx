import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Ticket } from 'lucide-react';
import { EndorsedBadge, SeasonPill } from '@/components/ui/Pill';
import { formatDate } from '@/lib/format';
import { DestinationPhoto } from './DestinationPhoto';

// One destination in a list (Home and Destinations), laid out like the mockup's rows.
export function DestinationRow({ destination: d, headingAs: Heading = 'h3' }) {
  return (
    <Link
      to={`/destinations/${d.id}`}
      className="group grid grid-cols-1 items-center gap-x-10 gap-y-4 border-b border-sage py-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)_auto]"
    >
      <DestinationPhoto destination={d} className="h-[220px] w-full rounded-panel" />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeasonPill season={d.season} />
          <span className="text-[12px] text-muted">Endorsed {formatDate(d.endorsedAt)}</span>
        </div>
        <Heading className="text-[26px] font-bold leading-tight tracking-[-0.015em] text-charcoal group-hover:text-forest">
          {d.name}
        </Heading>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-muted">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-pin" aria-hidden="true" />
            {d.jurisdiction} · Pampanga
          </span>
          <span>{d.categories.join(' · ')}</span>
          {d.entranceFee && (
            <span className="flex items-center gap-1.5">
              <Ticket className="h-4 w-4" aria-hidden="true" />
              {d.entranceFee}
            </span>
          )}
        </p>
        <p className="line-clamp-3 max-w-[70ch] text-[15px] leading-relaxed text-charcoal/80">
          {d.description}
        </p>
      </div>
      <div className="flex items-center gap-3 md:flex-col md:items-end">
        <EndorsedBadge />
        <span className="flex items-center gap-1 text-[14px] font-semibold text-forest">
          View details
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
