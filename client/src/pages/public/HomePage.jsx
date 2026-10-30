import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPinPlus, Search } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationPhoto } from '@/components/destinations/DestinationPhoto';
import { DestinationRow } from '@/components/destinations/DestinationRow';
import { CATEGORIES } from '@/constants/categories';
import { useSession } from '@/session/SessionContext';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';

const LATEST_COUNT = 3;

function categoryLink(name) {
  return `/destinations?categories=${encodeURIComponent(name)}`;
}

function Hero({ latest }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function search(event) {
    event.preventDefault();
    const text = q.trim();
    navigate(text ? `/destinations?q=${encodeURIComponent(text)}` : '/destinations');
  }

  return (
    <section className="bg-forest text-white">
      <div className="mx-auto grid max-w-page items-center gap-12 px-5 py-14 sm:px-8 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] xl:py-16">
        <div className="flex flex-col gap-7">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-minty">
            Lesser-known destinations in Pampanga
          </p>
          <h1 className="text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-[56px] xl:text-[64px]">
            Pampanga has more than the places you already know.
          </h1>
          <p className="max-w-[52ch] text-[18px] leading-relaxed text-white/85">
            Every destination here has been checked by a Local Tourism Officer before it is listed.
          </p>
          <form
            role="search"
            onSubmit={search}
            className="flex max-w-[620px] items-center gap-2 rounded-panel bg-surface p-2"
          >
            <label htmlFor="home-search" className="sr-only">
              Search destinations or municipalities
            </label>
            <Search className="ml-3 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
            <input
              id="home-search"
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search destinations or municipalities"
              className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-charcoal placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              className="h-11 rounded-ctl bg-forest px-5 text-[15px] font-semibold text-white hover:bg-forest-600"
            >
              Search
            </button>
          </form>
          <ul className="flex flex-wrap gap-2" aria-label="Categories">
            {CATEGORIES.map(({ name, icon: Icon }) => (
              <li key={name}>
                <Link
                  to={categoryLink(name)}
                  className="flex h-9 items-center gap-2 rounded-full bg-white/10 px-3 text-[14px] hover:bg-white/20"
                >
                  <Icon className="h-4 w-4 text-minty" aria-hidden="true" />
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {latest.length > 0 && (
          <div className="hidden auto-rows-[200px] grid-cols-2 gap-4 sm:grid xl:grid-rows-[260px_200px]">
            {latest.map((d, i) => (
              <Link
                key={d.id}
                to={`/destinations/${d.id}`}
                className={cn(
                  'group relative overflow-hidden rounded-panel',
                  (i === 0 || latest.length === 2) && 'col-span-2',
                )}
              >
                <DestinationPhoto
                  destination={d}
                  className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span className="absolute bottom-3 left-3 rounded-[8px] bg-charcoal/75 px-3 py-1.5 text-[13px]">
                  <span className="font-semibold">{d.name}</span> · {d.jurisdiction}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function NominateCallout() {
  const { user } = useSession();
  if (user && user.role !== 'registered_user') return null;
  return (
    <section className="mx-auto max-w-page px-5 pb-16 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-panel border border-gold/40 bg-gold-100 px-6 py-8 sm:px-10">
        <div className="flex max-w-[720px] flex-col gap-2">
          <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-charcoal">
            Know a place that deserves a look?
          </h2>
          <p className="text-[16px] text-charcoal/80">
            Nominate it. An administrator screens it first, then the Local Tourism Officer for that
            city or municipality decides whether it is endorsed.
          </p>
        </div>
        {user ? (
          <ButtonLink to="/nominate" size="lg">
            <MapPinPlus className="h-5 w-5" aria-hidden="true" />
            Nominate a destination
          </ButtonLink>
        ) : (
          <ButtonLink to="/signup" size="lg">
            Create an account to nominate
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

export function HomePage() {
  const latest = useApi(`/destinations?pageSize=${LATEST_COUNT}`);
  const overview = useApi('/destinations/overview');
  const destinations = latest.data?.destinations || [];
  const total = overview.data?.total ?? latest.data?.total ?? 0;

  return (
    <>
      <Hero latest={destinations} />

      <section
        className="mx-auto max-w-page px-5 py-14 sm:px-8 xl:py-16"
        aria-labelledby="latest-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-forest pb-4">
          <div className="flex flex-col gap-1">
            <h2
              id="latest-title"
              className="text-[32px] font-extrabold tracking-[-0.02em] text-forest"
            >
              Recently endorsed
            </h2>
            <p className="text-[15px] text-muted">
              Listed by endorsement date, newest first, not by popularity.
            </p>
          </div>
          {total > 0 && (
            <Link
              to="/destinations"
              className="flex h-11 items-center gap-2 rounded-ctl border border-forest px-5 text-[14px] font-semibold text-forest hover:bg-forest hover:text-white"
            >
              All {total} destinations
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        {latest.loading && !latest.data && (
          <div className="space-y-6 py-6">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-[220px] w-full" />
            ))}
          </div>
        )}
        {latest.error && (
          <EmptyState title="Could not load destinations">{latest.error.message}</EmptyState>
        )}
        {latest.data && !destinations.length && (
          <EmptyState title="No endorsed destinations yet">
            Destinations appear here once a Local Tourism Officer endorses them.
          </EmptyState>
        )}
        {destinations.map((d) => (
          <DestinationRow key={d.id} destination={d} />
        ))}
      </section>

      <section className="mx-auto max-w-page px-5 pb-16 sm:px-8" aria-labelledby="category-title">
        <h2
          id="category-title"
          className="mb-6 text-[26px] font-extrabold tracking-[-0.02em] text-forest"
        >
          Browse by category
        </h2>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {CATEGORIES.map(({ name, icon: Icon, color }) => (
            <li key={name}>
              <Link
                to={categoryLink(name)}
                className="flex h-full flex-col gap-4 rounded-panel border border-sage bg-surface p-5 hover:border-forest"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-ctl"
                  style={{ background: `${color}33` }}
                >
                  <Icon className="h-6 w-6 text-forest" aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[17px] font-bold text-charcoal">{name}</span>
                  <span className="min-h-[1.25em] text-[13px] text-muted">
                    {overview.data && `${overview.data.categories[name] ?? 0} endorsed`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <NominateCallout />
    </>
  );
}
