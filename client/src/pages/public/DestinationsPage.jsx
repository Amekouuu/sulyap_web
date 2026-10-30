import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPinned } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationRow } from '@/components/destinations/DestinationRow';
import { CATEGORIES } from '@/constants/categories';
import { SEASONS } from '@/constants/options';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const SEARCH_DELAY_MS = 300;
const SORTS = [
  { value: 'recent', label: 'Recently endorsed' },
  { value: 'az', label: 'A–Z' },
];

function FilterSelect({ id, label, value, onChange, children }) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 text-[14px]">
      <span className="text-muted">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-ctl border border-sage bg-surface pl-3 pr-8 text-[14px] font-semibold focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
      >
        {children}
      </select>
    </label>
  );
}

export function DestinationsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const categories = (params.get('categories') || '').split(',').filter(Boolean);
  const season = params.get('season') || '';
  const jurisdiction = params.get('jurisdiction') || '';
  const sort = params.get('sort') === 'az' ? 'az' : 'recent';
  const page = Math.max(1, Number(params.get('page')) || 1);

  // Filters live in the address bar, so a filtered list can be shared or bookmarked.
  function update(changes) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: !('page' in changes) },
    );
  }

  // The search box updates the address bar a moment after typing stops.
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    if (text.trim() === q) return undefined;
    const timer = setTimeout(() => update({ q: text.trim() }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // update only writes to the URL; adding it would restart the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, q]);

  function toggleCategory(name) {
    const next = categories.includes(name)
      ? categories.filter((c) => c !== name)
      : [...categories, name];
    update({ categories: next.join(',') });
  }

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (categories.length) query.set('categories', categories.join(','));
  if (season) query.set('season', season);
  if (jurisdiction) query.set('jurisdiction', jurisdiction);
  query.set('sort', sort);
  query.set('page', String(page));
  const list = useApi(`/destinations?${query}`);
  const overview = useApi('/destinations/overview');

  const total = list.data?.total ?? 0;
  const pages = list.data ? Math.max(1, Math.ceil(total / list.data.pageSize)) : 1;
  const filtered = Boolean(q || categories.length || season || jurisdiction);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  return (
    <section className="mx-auto max-w-page px-5 py-12 sm:px-8 xl:py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="text-[44px] font-extrabold leading-none tracking-[-0.03em] text-forest sm:text-[56px]">
            Destinations
          </h1>
          <p className="text-[16px] text-muted">Only endorsed destinations appear here.</p>
        </div>
        <SearchInput
          label="Search by name or municipality"
          placeholder="Search by name or municipality"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="w-full max-w-[640px]"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-y border-sage py-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          {CATEGORIES.map(({ name, icon: Icon }) => {
            const on = categories.includes(name);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(name)}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition-colors',
                  on
                    ? 'border-forest bg-forest text-white'
                    : 'border-sage bg-surface text-charcoal hover:border-forest',
                )}
              >
                <Icon
                  className={cn('h-4 w-4', on ? 'text-minty' : 'text-forest')}
                  aria-hidden="true"
                />
                {name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 xl:ml-auto">
          <FilterSelect
            id="filter-season"
            label="Season"
            value={season}
            onChange={(value) => update({ season: value })}
          >
            <option value="">All</option>
            {SEASONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="filter-jurisdiction"
            label="Municipality"
            value={jurisdiction}
            onChange={(value) => update({ jurisdiction: value })}
          >
            <option value="">All</option>
            {(overview.data?.jurisdictions || (jurisdiction ? [jurisdiction] : [])).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            id="filter-sort"
            label="Sort"
            value={sort}
            onChange={(value) => update({ sort: value === 'recent' ? '' : value })}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-semibold" aria-live="polite">
          {list.data
            ? `${plural(total, 'destination')} · ${sort === 'az' ? 'Alphabetical' : 'Recently endorsed first'}`
            : 'Loading destinations…'}
          {season && (
            <span className="ml-2 font-normal text-muted">
              Destinations without a season tag appear only under All.
            </span>
          )}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setText('');
              setParams(sort === 'az' ? { sort } : {}, { replace: true });
            }}
            className="text-[14px] font-semibold text-forest underline underline-offset-4"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={cn('mt-2 transition-opacity', list.loading && list.data && 'opacity-60')}>
        {list.loading && !list.data && (
          <div className="space-y-6 py-6">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-[220px] w-full" />
            ))}
          </div>
        )}
        {list.error && (
          <EmptyState icon={MapPinned} title="Could not load destinations">
            {list.error.message}
          </EmptyState>
        )}
        {list.data && !list.data.destinations.length && (
          <EmptyState icon={MapPinned} title="No destinations match these filters">
            Try another category, season, or municipality.
          </EmptyState>
        )}
        {list.data?.destinations.map((d) => (
          <DestinationRow key={d.id} destination={d} headingAs="h2" />
        ))}
      </div>

      {pages > 1 && (
        <nav
          aria-label="Pages"
          className="mt-8 flex items-center justify-center gap-4 text-[14px] font-semibold"
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>
          <span className="num">
            Page {page} of {pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pages}
            onClick={() => update({ page: String(page + 1) })}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </section>
  );
}
