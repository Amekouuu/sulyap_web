import { Suspense, lazy, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, House, MapPin, MapPinned, Ticket } from 'lucide-react';
import { HomeLocationForm } from '@/components/account/HomeLocationForm';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryTag, SeasonPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationPhoto } from '@/components/destinations/DestinationPhoto';
import { useSession } from '@/session/SessionContext';
import { DISCLAIMER_DISTANCE, NEARBY_DEFAULT_RADIUS, NEARBY_RADII } from '@/constants/options';
import { formatKm } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';

const PampangaMap = lazy(() => import('@/components/map/PampangaMap'));

function SelectedCard({ destination: d }) {
  return (
    <Card className="overflow-hidden">
      <DestinationPhoto destination={d} className="h-[180px] w-full" />
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap gap-2">
          {d.categories.map((c) => (
            <CategoryTag key={c} name={c} />
          ))}
          <SeasonPill season={d.season} />
        </div>
        <h2 className="text-[22px] font-extrabold leading-tight text-charcoal">{d.name}</h2>
        <ul className="flex flex-col gap-2 text-[14px]">
          <li className="flex items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-pin" aria-hidden="true" />
            {d.jurisdiction} · Pampanga
          </li>
          {d.entranceFee && (
            <li className="flex items-center gap-3">
              <Ticket className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              Entrance fee · {d.entranceFee}
            </li>
          )}
          {d.bestTime && (
            <li className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              Best time to visit · {d.bestTime}
            </li>
          )}
        </ul>
        <ButtonLink to={`/destinations/${d.id}`} className="mt-1 w-full">
          View details
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </Card>
  );
}

function PlaceList({ caption, items, selectedId, onSelect, emptyText, extra }) {
  return (
    <>
      <p className="border-b border-sage px-5 py-3 text-[13px] font-semibold text-muted">
        {caption}
      </p>
      {items.length ? (
        <ul className="divide-y divide-sage">
          {items.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelect(d.id)}
                className={cn(
                  'flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-cream',
                  d.id === selectedId && 'bg-minty-50',
                )}
              >
                <DestinationPhoto destination={d} className="h-14 w-16 shrink-0 rounded-[8px]" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-semibold text-charcoal">{d.name}</span>
                  <span className="text-[13px] text-muted">
                    {d.categories[0]} · {d.jurisdiction}
                  </span>
                </span>
                {extra && (
                  <span className="shrink-0 font-mono text-[13px] font-semibold text-forest">
                    {extra(d)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-[14px] text-muted">{emptyText}</p>
      )}
    </>
  );
}

function NearbyPanel({ user, radius, setRadius, nearby, onHomeSaved, selectedId, onSelect }) {
  const [editing, setEditing] = useState(false);

  if (user?.role !== 'registered_user') {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="text-[15px] font-semibold">Nearby Lesser-Known</p>
        <p className="text-[14px] text-muted">
          Log in with a registered account to see endorsed places close to where you live. Similar
          Places works without an account.
        </p>
        {!user && (
          <ButtonLink to="/login?next=%2Fmap" size="sm">
            Log in
          </ButtonLink>
        )}
      </div>
    );
  }

  if (!user.hasHomeLocation || editing) {
    return (
      <div className="flex flex-col gap-3 p-5">
        <p className="text-[15px] font-semibold">
          {user.hasHomeLocation ? 'Change your home location' : 'Where do you live?'}
        </p>
        {!user.hasHomeLocation && (
          <p className="text-[14px] text-muted">
            Set your home once to see endorsed places within 5, 10, or 20 km. You can change it
            later in Account Settings.
          </p>
        )}
        <HomeLocationForm
          onSaved={() => {
            setEditing(false);
            onHomeSaved();
          }}
          onCancel={user.hasHomeLocation ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  const items = nearby.data?.destinations || [];
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-sage px-5 py-4">
        <div className="flex items-start justify-between gap-3 text-[13px] text-muted">
          <span className="flex min-w-0 items-start gap-2">
            <House className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden="true" />
            <span className="min-w-0 break-words">{user.homeAddress || 'Pin on the map'}</span>
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 font-semibold text-forest underline"
          >
            Change
          </button>
        </div>
        <div className="flex gap-2" role="group" aria-label="Distance from home">
          {NEARBY_RADII.map((km) => (
            <button
              key={km}
              type="button"
              aria-pressed={radius === km}
              onClick={() => setRadius(km)}
              className={cn(
                'h-9 flex-1 rounded-full border text-[14px] font-semibold',
                radius === km
                  ? 'border-forest bg-forest text-white'
                  : 'border-sage text-charcoal hover:bg-cream',
              )}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>
      {nearby.error ? (
        <p className="px-5 py-6 text-[14px] text-terracotta-700">{nearby.error.message}</p>
      ) : (
        <PlaceList
          caption={`Endorsed places within ${radius} km of your home`}
          items={items}
          selectedId={selectedId}
          onSelect={onSelect}
          extra={(d) => formatKm(d.distanceKm)}
          emptyText={
            nearby.loading
              ? 'Loading…'
              : `No endorsed places within ${radius} km yet. Try a wider distance.`
          }
        />
      )}
      <p className="border-t border-sage px-5 py-3 text-[12px] text-muted">{DISCLAIMER_DISTANCE}</p>
    </>
  );
}

export function MapPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('similar');
  const [onlyList, setOnlyList] = useState(false);
  const [radius, setRadius] = useState(NEARBY_DEFAULT_RADIUS);
  const [homeVersion, setHomeVersion] = useState(0);
  const { user } = useSession();
  const all = useApi('/destinations/map');
  const showNearby = tab === 'nearby' && user?.role === 'registered_user' && user.hasHomeLocation;
  const nearby = useApi(
    showNearby ? `/destinations/nearby?radius=${radius}&v=${homeVersion}` : null,
  );
  const nearbyReady = Boolean(showNearby && nearby.data?.radius === radius);
  const destinations = all.data?.destinations || [];

  // The selected destination comes from the address (?d=5), so "Open in the map" links work.
  const requested = Number(params.get('d'));
  const selected = destinations.find((d) => d.id === requested) || destinations[0];
  const details = useApi(selected ? `/destinations/${selected.id}` : null);
  const similar = selected && details.data?.id === selected.id ? details.data.similar : [];

  function select(id) {
    setParams({ d: String(id) }, { replace: true });
  }

  let pins = destinations;
  if (onlyList && tab === 'similar' && selected) {
    pins = [selected, ...similar.filter((d) => d.id !== selected.id)];
  } else if (onlyList && nearbyReady) {
    pins = nearby.data.destinations;
  }
  const home = nearbyReady ? { ...nearby.data.home, radiusKm: radius } : undefined;

  return (
    <section className="mx-auto max-w-page px-5 py-10 sm:px-8 xl:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[44px] font-extrabold leading-none tracking-[-0.03em] text-forest sm:text-[52px]">
            Interactive Map
          </h1>
          <p className="text-[16px] text-muted">
            Only endorsed destinations are pinned. Select a pin to see its details.
          </p>
        </div>
        <ul
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted"
          aria-label="Map legend"
        >
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-pin" aria-hidden="true" />
            Selected
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-forest" aria-hidden="true" />
            Endorsed destination
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-charcoal/40" aria-hidden="true" />
            Outside Pampanga
          </li>
        </ul>
      </div>

      {all.error ? (
        <EmptyState icon={MapPinned} title="Could not load the map">
          {all.error.message}
        </EmptyState>
      ) : (
        <div className="mt-8 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Suspense fallback={<Skeleton className="h-[60vh] min-h-[360px] w-full xl:h-[680px]" />}>
            <PampangaMap
              destinations={pins}
              selectedId={selected?.id}
              onSelect={select}
              followSelected
              home={home}
              className="h-[60vh] min-h-[360px] xl:h-[680px]"
            />
          </Suspense>

          <aside className="flex min-w-0 flex-col gap-5">
            {all.loading && !all.data && <Skeleton className="h-[380px] w-full" />}
            {all.data && !selected && (
              <Card>
                <EmptyState icon={MapPinned} title="No endorsed destinations yet">
                  Pins appear once a Local Tourism Officer endorses a destination.
                </EmptyState>
              </Card>
            )}
            {selected && <SelectedCard destination={selected} />}

            {selected && (
              <Card className="overflow-hidden">
                <div className="flex border-b border-sage" role="group" aria-label="List to show">
                  {[
                    ['nearby', 'Nearby'],
                    ['similar', 'Similar Places'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={tab === value}
                      onClick={() => setTab(value)}
                      className={cn(
                        'h-12 flex-1 text-[15px] font-semibold',
                        tab === value
                          ? 'bg-forest text-white'
                          : 'bg-surface text-charcoal hover:bg-cream',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tab === 'nearby' && (
                  <NearbyPanel
                    user={user}
                    radius={radius}
                    setRadius={setRadius}
                    nearby={nearby}
                    onHomeSaved={() => setHomeVersion((v) => v + 1)}
                    selectedId={selected.id}
                    onSelect={select}
                  />
                )}
                {tab === 'similar' && (
                  <>
                    <PlaceList
                      caption={`Other places like ${selected.name}`}
                      items={similar}
                      selectedId={selected.id}
                      onSelect={select}
                      emptyText={details.loading ? 'Loading…' : 'No similar endorsed places yet.'}
                    />
                  </>
                )}
                {(tab === 'similar' || nearbyReady) && (
                  <label className="flex cursor-pointer items-center gap-3 border-t border-sage px-5 py-4 text-[14px]">
                    <input
                      type="checkbox"
                      checked={onlyList}
                      onChange={(event) => setOnlyList(event.target.checked)}
                      className="h-4 w-4 accent-[#234638]"
                    />
                    Show only these on the map
                  </label>
                )}
              </Card>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
