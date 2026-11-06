import { Suspense, lazy, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CircleCheck,
  CircleX,
  Route,
  Send,
  ShieldAlert,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Select, Textarea } from '@/components/ui/Form';
import { ModerationPill, WorkflowPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const PampangaMap = lazy(() => import('@/components/map/PampangaMap'));

const STEP_LABEL = {
  verified: 'Passed screening and routed',
  returned: 'Returned to the submitter',
  rejected: 'Rejected',
  endorsed: 'Endorsed',
};

function Row({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-sage py-3.5 last:border-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[14px] font-semibold">{label}</dt>
      <dd className="whitespace-pre-line text-[14px] leading-relaxed">{children || '—'}</dd>
    </div>
  );
}

function Checks({ checks }) {
  const clear = !checks.prohibited.length && !checks.duplicates.length && !checks.known.length;
  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-[17px] font-bold">Automatic checks</h2>
      {clear && (
        <p className="flex items-center gap-2 text-[14px] text-forest">
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
          No prohibited words, similar names, or already-promoted matches.
        </p>
      )}
      {checks.prohibited.length > 0 && (
        <p className="flex items-start gap-2 text-[14px] text-pin-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Prohibited words: {checks.prohibited.join(', ')}
        </p>
      )}
      {checks.duplicates.length > 0 && (
        <div className="text-[14px]">
          <p className="flex items-center gap-2 font-semibold text-gold-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Similar names in the same town
          </p>
          <ul className="mt-1 list-disc pl-6">
            {checks.duplicates.map((d) => (
              <li key={d.id}>
                <Link to={`/admin/destinations/${d.id}`} className="text-forest underline">
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {checks.known.length > 0 && (
        <div className="text-[14px]">
          <p className="flex items-center gap-2 font-semibold text-gold-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            On the already-promoted list
          </p>
          <ul className="mt-1 list-disc pl-6">
            {checks.known.map((k) => (
              <li key={k.id}>
                {k.name} <span className="break-all text-muted">({k.source})</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[13px] text-muted">
            The officer judges the lesser-known criteria. You may still route it.
          </p>
        </div>
      )}
    </Card>
  );
}

function Timeline({ d }) {
  const steps = [
    { title: 'Submitted', note: `${formatDate(d.submittedAt)} by ${d.submittedBy || 'unknown'}` },
    ...d.history.map((h) => ({
      title: STEP_LABEL[h.status] || h.status,
      note: `${formatDate(h.at)} by ${h.who}${h.remarks ? ` · ${h.remarks}` : ''}`,
    })),
  ];
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-[17px] font-bold">Workflow</h2>
      <ol>
        {steps.map((s, i) => (
          <li
            key={i}
            className={cn('grid grid-cols-[20px_1fr] gap-3', i < steps.length - 1 && 'pb-5')}
          >
            <span className="flex flex-col items-center">
              <span className="mt-1 h-3.5 w-3.5 rounded-full bg-forest" />
              {i < steps.length - 1 && <span className="w-px flex-1 bg-sage" />}
            </span>
            <span>
              <span className="block text-[14px] font-semibold">{s.title}</span>
              <span className="block text-[13px] text-muted">{s.note}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ScreeningDecision({ d, onDone }) {
  const toast = useToast();
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const officers = d.officers.map((o) => o.name).join(', ');

  async function decide(decision) {
    if (decision !== 'route' && remarks.trim().length < 5) {
      setError('Write remarks so the submitter knows what to fix or why.');
      return;
    }
    if (decision === 'rejected' && !window.confirm('Reject this nomination? This is final.'))
      return;
    setBusy(decision);
    setError('');
    try {
      await api(`/admin/destinations/${d.id}/screen`, {
        method: 'POST',
        body: { decision, remarks: remarks.trim() },
      });
      toast.show(
        decision === 'route'
          ? 'Routed to the Local Tourism Officer.'
          : decision === 'returned'
            ? 'Returned to the submitter.'
            : 'Nomination rejected.',
      );
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-[20px] font-extrabold text-forest">Screening decision</h2>
      <p className="text-[14px] text-muted">
        Check for spam, wrong information, and content unrelated to tourist spots in Pampanga. The
        lesser-known criteria are checked later by the Local Tourism Officer.
      </p>
      {officers ? (
        <p className="flex items-center gap-2 rounded-ctl bg-minty-50 p-3 text-[14px]">
          <Route className="h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
          <span>
            Passing routes this nomination to <span className="font-semibold">{officers}</span>.
          </span>
        </p>
      ) : (
        <p className="flex items-center gap-2 rounded-ctl bg-gold-100 p-3 text-[14px]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-gold-700" aria-hidden="true" />
          No Local Tourism Officer covers {d.jurisdiction} yet. Assign one in Users first.
        </p>
      )}
      <Field label="Remarks" hint="Required to return or reject. The submitter sees these.">
        {(props) => (
          <Textarea
            {...props}
            rows={3}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            maxLength={2000}
          />
        )}
      </Field>
      {error && (
        <p role="alert" className="text-[14px] font-medium text-pin-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => decide('route')}
          loading={busy === 'route'}
          disabled={!officers || Boolean(busy)}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Pass and route to officer
        </Button>
        <Button
          variant="secondary"
          onClick={() => decide('returned')}
          loading={busy === 'returned'}
          disabled={Boolean(busy)}
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          Return to submitter
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
      </div>
    </Card>
  );
}

function PullFromPublic({ d, onDone }) {
  const toast = useToast();
  const [status, setStatus] = useState('returned');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pull() {
    if (remarks.trim().length < 5) {
      setError('Write remarks so the submitter knows why.');
      return;
    }
    if (!window.confirm('Take this destination off the public site?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/admin/destinations/${d.id}/pull`, {
        method: 'POST',
        body: { status, remarks: remarks.trim() },
      });
      toast.show('The destination is no longer public.');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 border-pin/30 p-6">
      <h2 className="text-[18px] font-extrabold text-pin-700">Pull from public</h2>
      <p className="text-[14px] text-muted">
        Use this after a report shows the listing is wrong or harmful. Returned lets the submitter
        fix it and go through screening again; rejected is final.
      </p>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <Field label="Move to">
          {(props) => (
            <Select {...props} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="returned">Returned</option>
              <option value="rejected">Rejected</option>
            </Select>
          )}
        </Field>
        <Field label="Remarks" required>
          {(props) => (
            <Textarea
              {...props}
              rows={2}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              maxLength={2000}
            />
          )}
        </Field>
      </div>
      {error && (
        <p role="alert" className="text-[14px] font-medium text-pin-700">
          {error}
        </p>
      )}
      <Button variant="danger" onClick={pull} loading={busy}>
        <CircleX className="h-4 w-4" aria-hidden="true" />
        Take off the public site
      </Button>
    </Card>
  );
}

export function ScreeningPage() {
  const { destinationId } = useParams();
  const [version, setVersion] = useState(0);
  const { data: d, error } = useApi(`/admin/destinations/${destinationId}?v=${version}`);
  const reload = () => setVersion((v) => v + 1);

  if (error) {
    return (
      <EmptyState
        title="Destination not found"
        action={
          <Link to="/admin/destinations" className="font-semibold text-forest underline">
            Back to destinations
          </Link>
        }
      />
    );
  }
  if (!d || String(d.id) !== destinationId) return <Skeleton className="h-[480px] w-full" />;

  return (
    <div>
      <Link
        to="/admin/destinations"
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-forest"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to destinations
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-sage pb-6">
        <div>
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.025em] text-forest">
            {d.name}
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Read only. Only the submitter can change the content.
          </p>
        </div>
        <WorkflowPill status={d.status} audience="admin" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="space-y-2 p-6">
            <h2 className="text-[14px] font-semibold">Description</h2>
            <p className="whitespace-pre-line text-[16px] leading-relaxed">{d.description}</p>
          </Card>
          <Card as="dl" className="px-6 py-2">
            <Row label="City or municipality">{`${d.jurisdiction}, Pampanga`}</Row>
            <Row label="Location">{d.location}</Row>
            <Row label="Coordinates">
              <span className="font-mono">
                {d.latitude.toFixed(5)}, {d.longitude.toFixed(5)}
              </span>
            </Row>
            <Row label="Categories">{d.categories.join(', ')}</Row>
            <Row label="Entrance fee">{d.entranceFee}</Row>
            <Row label="Operating hours">{d.operatingHours}</Row>
            <Row label="Best time to visit">{d.bestTimeToVisit}</Row>
            <Row label="Safety reminders">{d.safetyReminders}</Row>
            <Row label="Submitted">
              {`${formatDate(d.submittedAt)} by ${d.submittedBy || 'unknown'}`}
            </Row>
          </Card>
          <section className="space-y-3">
            <h2 className="text-[20px] font-extrabold text-forest">
              Submitted photos ({d.photos.length})
            </h2>
            <p className="text-[14px] text-muted">
              Check that the photos match the description and are appropriate. Passing screening
              approves them.
            </p>
            <ul className="flex flex-wrap gap-3">
              {d.photos.map((p, i) => (
                <li key={p.id} className="space-y-1.5">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img
                      src={p.url}
                      alt={`Submitted photo ${i + 1}`}
                      className={cn(
                        'h-[110px] w-[150px] rounded-ctl object-cover',
                        p.isPrimary && 'ring-2 ring-forest',
                      )}
                    />
                  </a>
                  <ModerationPill status={p.status} />
                </li>
              ))}
            </ul>
          </section>
          {d.status === 'pending_verification' && <ScreeningDecision d={d} onDone={reload} />}
          {d.status === 'endorsed' && <PullFromPublic d={d} onDone={reload} />}
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
            <PampangaMap
              destinations={[d]}
              selectedId={d.id}
              scrollZoom={false}
              className="h-[300px]"
              label={`Map showing where ${d.name} is`}
            />
          </Suspense>
          <Checks checks={d.checks} />
          <Timeline d={d} />
          {d.criteria.length > 0 && (
            <Card className="space-y-3 p-6">
              <h2 className="text-[17px] font-bold">Officer&apos;s criteria checklist</h2>
              {d.criteria.map((c) => (
                <p key={c.id} className="flex items-start gap-3 text-[14px]">
                  {c.status === 'met' ? (
                    <CircleCheck className="h-5 w-5 shrink-0 text-forest" aria-hidden="true" />
                  ) : (
                    <CircleX
                      className={cn(
                        'h-5 w-5 shrink-0',
                        c.status === 'not_met' ? 'text-pin' : 'text-sage',
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    <span className="font-semibold">{c.name}</span>
                    {c.googleMapsReviews !== null && (
                      <span className="block text-muted">
                        Google Maps {c.googleMapsReviews} · TripAdvisor {c.tripadvisorReviews}{' '}
                        reviews
                      </span>
                    )}
                  </span>
                </p>
              ))}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
