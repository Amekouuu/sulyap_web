import { Suspense, lazy, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Flag,
  Info,
  Map as MapIcon,
  MapPin,
  MapPinOff,
  MessageSquare,
  PenLine,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Carousel } from '@/components/ui/Carousel';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { CategoryTag, EndorsedBadge, SeasonPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { DestinationPhoto } from '@/components/destinations/DestinationPhoto';
import { ReportModal } from '@/components/destinations/ReportModal';
import { ReviewModal } from '@/components/destinations/ReviewModal';
import { Stars } from '@/components/destinations/Stars';
import { DISCLAIMER_PRACTICAL, SEASONS } from '@/constants/options';
import { useSession } from '@/session/SessionContext';
import { formatDate, plural } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const PampangaMap = lazy(() => import('@/components/map/PampangaMap'));
const REVIEWS_SHOWN = 5;

function DetailRow({ label, children }) {
  if (!children) return null;
  return (
    <div className="grid gap-1 border-b border-sage py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[15px] text-muted">{label}</dt>
      <dd className="whitespace-pre-line text-[15px] leading-relaxed text-charcoal">{children}</dd>
    </div>
  );
}

function ReviewItem({ review, onReport }) {
  return (
    <article className="flex flex-col gap-3 border-b border-sage py-5 last:border-b-0">
      <div className="flex items-center gap-3">
        <Avatar name={review.by} size="sm" strong />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-charcoal">{review.by}</p>
          <p className="text-[12px] text-muted">{formatDate(review.createdAt)}</p>
        </div>
        <Stars value={review.rating} className="h-3.5 w-3.5" />
      </div>
      {review.text && (
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{review.text}</p>
      )}
      {review.photos.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Photos with this review">
          {review.photos.map((p, i) => (
            <li key={p.id} className="relative">
              <img
                src={p.url}
                alt={p.caption || `Photo by ${review.by}`}
                loading="lazy"
                className="h-16 w-20 rounded-[8px] object-cover"
              />
              {onReport && (
                <button
                  type="button"
                  onClick={() =>
                    onReport({ type: 'image', id: p.id, label: `Photo ${i + 1} by ${review.by}` })
                  }
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-muted shadow-card hover:text-pin"
                  aria-label={`Report photo ${i + 1} by ${review.by}`}
                >
                  <Flag className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {onReport && (
        <button
          type="button"
          onClick={() =>
            onReport({ type: 'review', id: review.id, label: `Review by ${review.by}` })
          }
          className="flex w-fit items-center gap-1 text-[13px] text-muted hover:text-pin"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          Report
        </button>
      )}
    </article>
  );
}

function Reviews({ destination, onWrite, onReport }) {
  const [showAll, setShowAll] = useState(false);
  const { reviews, rating } = destination;
  const shown = showAll ? reviews : reviews.slice(0, REVIEWS_SHOWN);

  return (
    <Card as="section" className="p-6" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-forest pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="reviews-title" className="text-[22px] font-extrabold text-forest">
            Reviews
          </h2>
          {rating.count > 0 && (
            <p className="flex items-center gap-2 text-[15px]">
              <Stars value={rating.average} />
              <span className="font-semibold">{rating.average.toFixed(1)}</span>
              <span className="text-muted">({rating.count})</span>
            </p>
          )}
        </div>
        {onWrite && (
          <Button size="sm" onClick={onWrite}>
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Write a review
          </Button>
        )}
      </div>
      {reviews.length ? (
        <>
          {shown.map((review) => (
            <ReviewItem key={review.id} review={review} onReport={onReport} />
          ))}
          {reviews.length > REVIEWS_SHOWN && (
            <button
              type="button"
              onClick={() => setShowAll((all) => !all)}
              className="mt-2 text-[14px] font-semibold text-forest underline underline-offset-4"
            >
              {showAll ? 'Show fewer reviews' : `Show all ${plural(reviews.length, 'review')}`}
            </button>
          )}
        </>
      ) : (
        <EmptyState icon={MessageSquare} title="No reviews yet" className="py-10">
          Nobody has written about this place on Sulyap yet.
        </EmptyState>
      )}
    </Card>
  );
}

function Similar({ destination }) {
  if (!destination.similar.length) return null;
  const byCategory = destination.similar.every((s) => s.reason === 'category');
  return (
    <Card as="section" className="flex flex-col gap-4 p-6" aria-labelledby="similar-title">
      <div>
        <h2 id="similar-title" className="text-[20px] font-extrabold text-forest">
          Similar destinations
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Endorsed places that share a category
          {byCategory ? '' : ', or are in the same municipality'}.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {destination.similar.map((s) => (
          <li key={s.id}>
            <Link to={`/destinations/${s.id}`} className="group flex items-center gap-4">
              <DestinationPhoto destination={s} className="h-16 w-20 shrink-0 rounded-ctl" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-semibold text-charcoal group-hover:text-forest">
                  {s.name}
                </span>
                <span className="text-[13px] text-muted">
                  {s.jurisdiction} · {s.categories.join(', ')}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-5 py-12 sm:px-8">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-14 w-2/3" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="aspect-[16/10] w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

export function DestinationPage() {
  const { destinationId } = useParams();
  const location = useLocation();
  const { user } = useSession();
  const toast = useToast();
  const { data: d, error, loading } = useApi(`/destinations/${destinationId}`);
  const [writing, setWriting] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [askLogin, setAskLogin] = useState(null); // what the guest tried to do

  // Staff accounts do not post. Guests are asked to log in; unverified users are told why.
  const canPost = !user || user.role === 'registered_user';
  function guarded(what, action) {
    return () => {
      if (!user) setAskLogin(what);
      else if (!user.canContribute)
        toast.show('Your ID must be verified before you can post. Check Account Settings.', {
          tone: 'error',
        });
      else action();
    };
  }

  if (error) {
    const missing = error.status === 404 || error.status === 400;
    return (
      <div className="mx-auto max-w-[900px] px-5 py-20 sm:px-8">
        <EmptyState
          icon={MapPinOff}
          title={missing ? 'This destination is not available' : 'Could not load this destination'}
          action={<ButtonLink to="/destinations">Browse destinations</ButtonLink>}
        >
          {missing
            ? 'Only endorsed destinations can be viewed. It may still be under review, or it was removed.'
            : error.message}
        </EmptyState>
      </div>
    );
  }
  // While another destination loads (for example from Similar destinations), show the skeleton.
  if (!d || (loading && String(d.id) !== destinationId)) return <PageSkeleton />;

  const season = SEASONS.find((s) => s.value === d.season);
  const photos = d.photos.map((p) => ({
    src: p.url,
    alt: p.caption || `${d.name}, photo by ${p.by}`,
    caption: p.caption ? `${p.caption} · ${p.by}` : `Photo by ${p.by}`,
  }));
  const report = (target) => guarded('report content', () => setReportTarget(target))();
  const next = encodeURIComponent(location.pathname);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 xl:py-12">
      <nav aria-label="Breadcrumb" className="text-[14px] text-muted">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link to="/destinations" className="hover:text-forest">
              Destinations
            </Link>
            <span aria-hidden="true"> /</span>
          </li>
          <li aria-current="page" className="text-charcoal">
            {d.name}
          </li>
        </ol>
      </nav>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] text-forest sm:text-[52px]">
            {d.name}
          </h1>
          <p className="flex items-start gap-2 text-[16px] text-muted">
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-pin" aria-hidden="true" />
            {d.location}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EndorsedBadge />
          <SeasonPill season={d.season} />
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col">
          <Carousel images={photos} />
          <div className="mt-5 flex flex-wrap gap-2">
            {d.categories.map((c) => (
              <CategoryTag key={c} name={c} withIcon />
            ))}
          </div>
          <p className="mt-5 whitespace-pre-line text-[18px] leading-relaxed">{d.description}</p>

          <dl className="mt-8 border-t border-sage">
            <DetailRow label="Municipality">{`${d.jurisdiction}, Pampanga`}</DetailRow>
            <DetailRow label="Entrance fee">{d.entranceFee}</DetailRow>
            <DetailRow label="Operating hours">{d.operatingHours}</DetailRow>
            <DetailRow label="Best time to visit">{d.bestTime}</DetailRow>
            <DetailRow label="Safety reminders">{d.safetyReminders}</DetailRow>
            <DetailRow label="Season tag">
              {season ? season.label : 'None · shown under all seasons'}
            </DetailRow>
            <DetailRow label="Endorsement">
              {`Endorsed ${formatDate(d.endorsedAt)}${d.endorsedBy ? ` by ${d.endorsedBy}` : ''}`}
            </DetailRow>
          </dl>
          <p className="mt-5 flex items-start gap-3 rounded-ctl border border-minty-100 bg-minty-50 p-4 text-[13px] leading-relaxed">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
            {DISCLAIMER_PRACTICAL}
          </p>
          {canPost && (
            <button
              type="button"
              onClick={() => report({ type: 'destination', id: d.id, label: d.name })}
              className="mt-4 flex w-fit items-center gap-1.5 text-[14px] text-muted hover:text-pin"
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
              Report wrong information
            </button>
          )}

          <section className="mt-12" aria-labelledby="location-title">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-forest pb-3">
              <h2
                id="location-title"
                className="text-[28px] font-extrabold tracking-[-0.02em] text-forest"
              >
                Location
              </h2>
              <Link
                to={`/map?d=${d.id}`}
                className="flex h-10 items-center gap-2 rounded-ctl border border-forest px-4 text-[14px] font-semibold text-forest hover:bg-forest hover:text-white"
              >
                <MapIcon className="h-4 w-4" aria-hidden="true" />
                Open in the map
              </Link>
            </div>
            <Suspense fallback={<Skeleton className="mt-5 h-[420px] w-full" />}>
              <PampangaMap
                key={d.id}
                destinations={[d]}
                selectedId={d.id}
                scrollZoom={false}
                className="mt-5 h-[360px] sm:h-[420px]"
                label={`Map showing where ${d.name} is`}
              />
            </Suspense>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Reviews
            key={d.id}
            destination={d}
            onWrite={canPost ? guarded('write a review', () => setWriting(true)) : null}
            onReport={canPost ? report : null}
          />
          <Similar destination={d} />
        </aside>
      </div>

      <ReviewModal
        open={writing}
        destination={d}
        onClose={() => setWriting(false)}
        onDone={() => {
          setWriting(false);
          toast.show('Thanks! Your review will appear after an administrator checks it.');
        }}
      />
      <ReportModal
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onDone={() => {
          setReportTarget(null);
          toast.show('Report sent. An administrator will look at it.');
        }}
      />
      <Modal
        open={Boolean(askLogin)}
        onClose={() => setAskLogin(null)}
        size="sm"
        title={`Log in to ${askLogin || 'continue'}`}
        description="Browsing is open to everyone. Writing reviews, reporting, and nominating need a registered account with a verified ID."
        footer={
          <>
            <ButtonLink to="/signup" variant="secondary">
              Sign up
            </ButtonLink>
            <ButtonLink to={`/login?next=${next}`}>Log in</ButtonLink>
          </>
        }
      />
    </div>
  );
}
