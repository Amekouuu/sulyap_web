import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  Check,
  CircleCheck,
  CircleDashed,
  CircleX,
  CloudRain,
  Inbox,
  Minus,
  Sun,
  Undo2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Form';
import { WorkflowPill } from '@/components/ui/Pill';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { DestinationPhoto } from '@/components/destinations/DestinationPhoto';
import { CRITERIA, REVIEW_COUNT_LIMIT } from '@/constants/criteria';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const PampangaMap = lazy(() => import('@/components/map/PampangaMap'));
const today = () => new Date().toISOString().slice(0, 10);

function SubmissionRow({ d, action }) {
  return (
    <Card
      as="article"
      className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:gap-6 sm:pr-6"
    >
      <DestinationPhoto
        destination={d}
        className="h-[68px] w-[88px] rounded-ctl sm:h-[84px] sm:w-[120px]"
      />
      <div className="min-w-0 space-y-1">
        <p className="text-[18px] font-bold">{d.name}</p>
        <p className="text-[14px] text-muted">
          {d.jurisdiction} · {d.categories.join(' · ')}
          {d.screenedAt ? ` · Screened ${formatDate(d.screenedAt)}` : ''}
          {d.decidedAt ? ` · Decided ${formatDate(d.decidedAt)}` : ''}
        </p>
        <p className="truncate text-[14px]">{d.description}</p>
      </div>
      <div className="col-span-2 flex items-center justify-end gap-3 sm:col-span-1 sm:flex-col sm:items-end">
        <WorkflowPill status={d.decision || d.status} audience="officer" />
        {action}
      </div>
    </Card>
  );
}

export function OfficerSubmissionsPage() {
  const [q, setQ] = useState('');
  const search = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const { data, error } = useApi(`/officer/submissions${search}`);
  const list = data?.submissions || [];
  return (
    <div>
      <div className="space-y-3 border-b border-sage pb-6">
        <h1 className="text-[44px] font-extrabold leading-none tracking-[-0.03em] text-forest">
          Assigned Submissions
        </h1>
        <p className="text-[16px] text-muted">
          These nominations passed the administrator&apos;s screening and are waiting for your
          decision. You only see submissions in your jurisdictions.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <SearchInput
          label="Search assigned submissions"
          placeholder="Search assigned submissions"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="w-full max-w-[480px]"
        />
        {data && <p className="text-[14px] text-muted">{list.length} waiting · oldest first</p>}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {!data && !error && [1, 2].map((n) => <Skeleton key={n} className="h-[110px]" />)}
        {error && <EmptyState title="Could not load submissions">{error.message}</EmptyState>}
        {data && !list.length && (
          <Card>
            <EmptyState icon={Inbox} title="No submissions waiting">
              New nominations appear here after an administrator screens them.
            </EmptyState>
          </Card>
        )}
        {list.map((d) => (
          <SubmissionRow
            key={d.id}
            d={d}
            action={
              <Link
                to={`/officer/submissions/${d.id}`}
                className="flex h-10 items-center gap-2 rounded-ctl bg-forest px-5 text-[14px] font-semibold text-white hover:bg-forest-600"
              >
                {d.hasDraft ? 'Continue review' : 'Review'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
        ))}
      </div>
    </div>
  );
}

export function OfficerReviewedPage() {
  const [status, setStatus] = useState('all');
  const { data, error } = useApi(`/officer/reviewed?status=${status}`);
  const list = data?.reviewed || [];
  return (
    <div>
      <div className="space-y-3 border-b border-sage pb-6">
        <h1 className="text-[44px] font-extrabold leading-none tracking-[-0.03em] text-forest">
          Reviewed Submissions
        </h1>
        <p className="text-[16px] text-muted">Submissions you have decided on.</p>
      </div>
      <Tabs
        className="mt-6"
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'endorsed', label: 'Endorsed' },
          { value: 'returned', label: 'Returned' },
          { value: 'rejected', label: 'Rejected' },
        ]}
        value={status}
        onChange={setStatus}
        label="Decision"
      />
      <div className="mt-6 flex flex-col gap-3">
        {!data && !error && <Skeleton className="h-[110px]" />}
        {error && <EmptyState title="Could not load">{error.message}</EmptyState>}
        {data && !list.length && (
          <Card>
            <EmptyState icon={Inbox} title="Nothing here yet" />
          </Card>
        )}
        {list.map((d) => (
          <SubmissionRow
            key={d.id}
            d={d}
            action={
              <Link
                to={`/officer/submissions/${d.id}`}
                className="flex h-10 items-center rounded-ctl border border-sage px-4 text-[14px] font-semibold hover:border-forest"
              >
                View details
              </Link>
            }
          />
        ))}
      </div>
    </div>
  );
}

function MetButtons({ value, onChange, disabled, label }) {
  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {[
        ['met', 'Met', Check],
        ['not_met', 'Not met', X],
      ].map(([v, text, Icon]) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(on ? 'not_assessed' : v)}
            className={cn(
              'flex h-10 items-center gap-2 rounded-ctl border px-4 text-[14px] font-semibold disabled:cursor-default',
              on
                ? v === 'met'
                  ? 'border-forest bg-forest text-white'
                  : 'border-pin bg-pin text-white'
                : 'border-sage bg-surface hover:border-forest',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {text}
          </button>
        );
      })}
    </div>
  );
}

const SEASON_CHOICES = [
  ['Summer', 'Summer', Sun],
  ['Rainy', 'Rainy Season', CloudRain],
  [null, 'No tag', Minus],
];

export function OfficerReviewPage() {
  const { destinationId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: d, error } = useApi(`/officer/submissions/${destinationId}`);
  const [criteria, setCriteria] = useState(null);
  const [season, setSeason] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!d) return;
    setCriteria(
      d.criteria.map((c) => ({
        ...c,
        googleMapsReviews: c.googleMapsReviews ?? '',
        tripadvisorReviews: c.tripadvisorReviews ?? '',
        observedAt: c.observedAt ? String(c.observedAt).slice(0, 10) : '',
      })),
    );
    setSeason(d.seasonTag);
    setRemarks(d.decision?.remarks || '');
  }, [d]);

  if (error) {
    return (
      <EmptyState
        title="Submission not available"
        action={
          <Link to="/officer" className="font-semibold text-forest underline">
            Back to assigned submissions
          </Link>
        }
      >
        {error.message}
      </EmptyState>
    );
  }
  if (!d || !criteria) return <Skeleton className="h-[480px] w-full" />;

  const open = d.status === 'pending_endorsement';
  const allMet = criteria.every((c) => c.status === 'met');
  const update = (i, changes) =>
    setCriteria((list) => list.map((c, j) => (j === i ? { ...c, ...changes } : c)));
  const payload = (decision) => ({
    criteria: criteria.map((c) => ({
      id: c.id,
      status: c.status,
      notes: c.notes,
      googleMapsReviews: c.googleMapsReviews === '' ? null : Number(c.googleMapsReviews),
      tripadvisorReviews: c.tripadvisorReviews === '' ? null : Number(c.tripadvisorReviews),
      observedAt: c.observedAt || null,
    })),
    seasonTag: season,
    ...(decision ? { decision, remarks: remarks.trim() } : {}),
  });

  async function saveDraft() {
    setBusy('draft');
    setProblem('');
    try {
      await api(`/officer/submissions/${d.id}/checklist`, { method: 'PUT', body: payload() });
      toast.show('Checklist saved as a draft.');
    } catch (err) {
      setProblem(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function decide(decision) {
    if (decision !== 'endorsed' && remarks.trim().length < 5) {
      setProblem('Write remarks so the submitter knows what to fix or why it does not qualify.');
      return;
    }
    if (decision === 'rejected' && !window.confirm('Reject this nomination? This is final.'))
      return;
    setBusy(decision);
    setProblem('');
    try {
      await api(`/officer/submissions/${d.id}/decision`, {
        method: 'POST',
        body: payload(decision),
      });
      toast.show(
        decision === 'endorsed'
          ? `${d.name} is endorsed and now public.`
          : decision === 'returned'
            ? 'Returned to the submitter.'
            : 'Nomination rejected.',
      );
      navigate('/officer/reviewed');
    } catch (err) {
      setProblem(err.message);
    } finally {
      setBusy(null);
    }
  }

  const first = criteria[0];
  const overLimit =
    Number(first.googleMapsReviews) > REVIEW_COUNT_LIMIT ||
    Number(first.tripadvisorReviews) > REVIEW_COUNT_LIMIT;

  return (
    <div>
      <Link
        to={open ? '/officer' : '/officer/reviewed'}
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-forest"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {open ? 'Back to assigned submissions' : 'Back to reviewed submissions'}
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-sage pb-6">
        <div className="space-y-2">
          <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.03em] text-forest sm:text-[48px]">
            {d.name}
          </h1>
          <p className="text-[16px]">
            {d.location} · {d.categories.join(', ')}
          </p>
          <p className="text-[13px] text-muted">
            Nominated by {d.submittedBy} on {formatDate(d.submittedAt)}
            {d.screenedBy ? ` · screened by ${d.screenedBy} on ${formatDate(d.screenedAt)}` : ''}
          </p>
        </div>
        <WorkflowPill status={d.status} audience="officer" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-10">
          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold">Description</h2>
            <p className="whitespace-pre-line text-[17px] leading-relaxed">{d.description}</p>
            <dl className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                ['Entrance fee', d.entranceFee],
                ['Operating hours', d.operatingHours],
                ['Best time to visit', d.bestTimeToVisit],
                ['Safety reminders', d.safetyReminders],
              ].map(([k, v]) => (
                <div key={k} className="rounded-ctl border border-sage bg-surface p-4">
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {k}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-[14px]">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold">Submitted photos ({d.photos.length})</h2>
            <ul className="flex flex-wrap gap-3">
              {d.photos.map((p, i) => (
                <li key={p.id}>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img
                      src={p.url}
                      alt={`Submitted photo ${i + 1}`}
                      className="h-[110px] w-[150px] rounded-ctl object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-6 border-t-2 border-forest pt-8">
            <div className="space-y-1">
              <h2 className="text-[28px] font-extrabold tracking-[-0.02em] text-forest">
                Classification checklist
              </h2>
              <p className="text-[15px] text-muted">
                All three conditions must be met to endorse. Record what you found and when.
              </p>
            </div>
            {d.knownMatches.length > 0 && (
              <p className="rounded-ctl border border-gold/40 bg-gold-100 p-4 text-[14px]">
                Similar to places on the already-promoted list:{' '}
                {d.knownMatches.map((k) => k.name).join(', ')}. Check criteria 2 and 3 carefully.
              </p>
            )}
            {criteria.map((c, i) => {
              const text = CRITERIA.find((x) => x.id === c.id)?.text || c.description;
              return (
                <Card
                  key={c.id}
                  className={cn(
                    'space-y-3 p-6',
                    c.status === 'met' && 'border-forest',
                    c.status === 'not_met' && 'border-pin/50',
                  )}
                >
                  <h3 className="text-[18px] font-bold">
                    {i + 1}. {c.name}
                  </h3>
                  <p className="max-w-[80ch] text-[14px] text-muted">{text}</p>
                  {c.id === 1 && (
                    <>
                      <div className="grid max-w-[640px] grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                          ['googleMapsReviews', 'Google Maps reviews', 'number'],
                          ['tripadvisorReviews', 'TripAdvisor reviews', 'number'],
                          ['observedAt', 'Date checked', 'date'],
                        ].map(([key, label, type]) => (
                          <label
                            key={key}
                            className="flex flex-col gap-1.5 text-[13px] font-semibold"
                          >
                            {label}
                            <input
                              type={type}
                              min={type === 'number' ? 0 : undefined}
                              max={type === 'date' ? today() : undefined}
                              disabled={!open}
                              value={c[key]}
                              onChange={(event) => update(i, { [key]: event.target.value })}
                              className="h-11 rounded-ctl border border-sage bg-surface px-3 text-[14px] font-normal"
                            />
                          </label>
                        ))}
                      </div>
                      <p
                        className={cn(
                          'text-[12px]',
                          overLimit ? 'font-semibold text-pin-700' : 'text-muted',
                        )}
                      >
                        {REVIEW_COUNT_LIMIT} or fewer on each platform passes. Each platform is
                        counted on its own.
                      </p>
                    </>
                  )}
                  <label className="block space-y-1.5">
                    <span className="text-[13px] font-semibold">Evidence and notes</span>
                    <input
                      disabled={!open}
                      value={c.notes}
                      onChange={(event) => update(i, { notes: event.target.value })}
                      placeholder="What you checked (links, page names, dates)"
                      className="h-11 w-full max-w-[640px] rounded-ctl border border-sage bg-surface px-4 text-[14px]"
                    />
                  </label>
                  <MetButtons
                    label={`Criterion ${i + 1}`}
                    value={c.status}
                    disabled={!open}
                    onChange={(status) => update(i, { status })}
                  />
                </Card>
              );
            })}
          </section>

          <section className="space-y-4 border-t border-sage pt-8">
            <h2 className="text-[22px] font-extrabold text-forest">Season tag</h2>
            <p className="text-[14px] text-muted">
              Used by the season filter. Untagged destinations still show under All.
              {d.bestTimeToVisit ? ` The submitter wrote: "${d.bestTimeToVisit}".` : ''}
            </p>
            <div className="flex flex-wrap gap-3" role="group" aria-label="Season tag">
              {SEASON_CHOICES.map(([value, label, Icon]) => (
                <button
                  key={label}
                  type="button"
                  disabled={!open}
                  aria-pressed={season === value}
                  onClick={() => setSeason(value)}
                  className={cn(
                    'flex h-11 items-center gap-2 rounded-ctl border px-5 text-[14px] font-semibold',
                    season === value
                      ? 'border-forest bg-forest text-white'
                      : 'border-sage bg-surface hover:border-forest',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-sage pt-8">
            <label className="block space-y-2">
              <span className="text-[15px] font-semibold">
                Remarks{' '}
                <span className="font-normal text-muted">(required to return or reject)</span>
              </span>
              <Textarea
                rows={3}
                disabled={!open}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                maxLength={2000}
                placeholder="Tell the submitter what to fix, or why it does not qualify."
              />
            </label>
            {problem && (
              <p role="alert" className="text-[14px] font-medium text-pin-700">
                {problem}
              </p>
            )}
            {open ? (
              <>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => decide('endorsed')}
                    loading={busy === 'endorsed'}
                    disabled={!allMet || overLimit || Boolean(busy)}
                  >
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    Endorse
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => decide('returned')}
                    loading={busy === 'returned'}
                    disabled={Boolean(busy)}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                    Return
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => decide('rejected')}
                    loading={busy === 'rejected'}
                    disabled={Boolean(busy)}
                  >
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    Reject
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={saveDraft}
                    loading={busy === 'draft'}
                    disabled={Boolean(busy)}
                  >
                    Save as draft
                  </Button>
                </div>
                {!allMet && (
                  <p className="text-[13px] text-muted">
                    Endorse unlocks when all three criteria are marked Met.
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-ctl bg-minty-50 p-4 text-[14px]">
                Decision recorded: <WorkflowPill status={d.status} audience="officer" />
                {d.decision && (
                  <span>
                    on {formatDate(d.decision.at)} by {d.decision.by}.
                  </span>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-5 self-start xl:sticky xl:top-28">
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
            <PampangaMap
              destinations={[d]}
              selectedId={d.id}
              scrollZoom={false}
              className="h-[300px]"
              label={`Map showing where ${d.name} is`}
            />
          </Suspense>
          <p className="font-mono text-[13px] text-muted">
            {d.latitude.toFixed(5)}, {d.longitude.toFixed(5)}
          </p>
          <Card className="space-y-3 p-5">
            <h3 className="text-[15px] font-bold">Checklist summary</h3>
            {criteria.map((c) => {
              const Icon =
                c.status === 'met' ? CircleCheck : c.status === 'not_met' ? CircleX : CircleDashed;
              return (
                <p key={c.id} className="flex items-center gap-3 text-[14px]">
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      c.status === 'met'
                        ? 'text-forest'
                        : c.status === 'not_met'
                          ? 'text-pin'
                          : 'text-sage',
                    )}
                    aria-hidden="true"
                  />
                  {c.name}
                </p>
              );
            })}
            <p
              className={cn(
                'border-t border-sage pt-3 text-[13px]',
                allMet ? 'font-semibold text-forest' : 'text-muted',
              )}
            >
              {allMet ? 'Qualifies as lesser-known.' : 'Not all conditions are met yet.'}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
