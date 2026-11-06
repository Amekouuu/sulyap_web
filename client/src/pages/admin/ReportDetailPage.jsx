import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModerationPill, ReportPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Stars } from '@/components/destinations/Stars';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const LABEL = { review: 'Review', image: 'Photo', destination: 'Destination information' };

function Row({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-sage py-4 last:border-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px]">{children}</dd>
    </div>
  );
}

export function ReportDetailPage() {
  const { reportId } = useParams();
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(null);
  const { data: r, error } = useApi(`/admin/reports/${reportId}?v=${version}`);

  async function close(status, removeContent = false) {
    if (removeContent && !window.confirm('Remove this content? This cannot be undone.')) return;
    setBusy(status + removeContent);
    try {
      await api(`/admin/reports/${reportId}/close`, {
        method: 'POST',
        body: { status, removeContent },
      });
      toast.show(
        status === 'under_review'
          ? 'Marked under review.'
          : removeContent
            ? 'Content removed and report resolved.'
            : `Report ${status}.`,
      );
      setVersion((v) => v + 1);
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  if (error) return <EmptyState title="Report not found" />;
  if (!r || String(r.id) !== reportId) return <Skeleton className="h-[400px] w-full" />;
  const open = ['pending', 'under_review'].includes(r.status);
  const content = r.review || r.image;

  return (
    <div>
      <Link
        to="/admin/reports"
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-forest"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to reports
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 pb-6">
        <h1 className="text-[44px] font-extrabold leading-none tracking-[-0.025em] text-forest">
          Report #{r.id}
        </h1>
        <ReportPill status={r.status} />
      </div>
      <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card as="dl" className="px-6 py-2">
            <Row label="Reason">{r.reason}</Row>
            <Row label="Reported content">
              {r.review && (
                <div className="space-y-1 rounded-ctl bg-cream p-4">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    Review by {r.review.by} · {formatDate(r.review.at)}
                    <Stars value={r.review.rating} className="h-3.5 w-3.5" />
                    <ModerationPill status={r.review.status} />
                  </p>
                  <p className={r.review.status === 'removed' ? 'text-muted line-through' : ''}>
                    {r.review.text || '(no text)'}
                  </p>
                </div>
              )}
              {r.image && (
                <div className="flex items-start gap-4 rounded-ctl bg-cream p-4">
                  <a href={r.image.url} target="_blank" rel="noreferrer">
                    <img
                      src={r.image.url}
                      alt={`Reported photo by ${r.image.by}`}
                      className="h-[90px] w-[120px] rounded-ctl object-cover"
                    />
                  </a>
                  <p className="space-y-1 text-[13px] text-muted">
                    <span className="block">Photo by {r.image.by}</span>
                    <ModerationPill status={r.image.status} />
                  </p>
                </div>
              )}
              {r.target === 'destination' && (
                <Link
                  to={`/admin/destinations/${r.destination.id}`}
                  className="font-semibold text-forest underline underline-offset-4"
                >
                  {r.destination.name}
                </Link>
              )}
            </Row>
            <Row label="Content type">{LABEL[r.target]}</Row>
            <Row label="Destination">
              <Link to={`/destinations/${r.destination.id}`} className="text-forest underline">
                {r.destination.name}
              </Link>{' '}
              · {r.destination.jurisdiction}
            </Row>
            <Row label="Reported by">{r.reportedBy}</Row>
            <Row label="Submitted">{formatDate(r.createdAt)}</Row>
            {r.resolvedBy && (
              <Row label="Closed">
                {formatDate(r.resolvedAt)} by {r.resolvedBy}
              </Row>
            )}
          </Card>
          {open ? (
            <>
              <p className="max-w-[80ch] text-[14px] text-muted">
                Closing a report records what happened to the content. Removing is permanent.
                {r.target === 'destination' &&
                  ' To take the destination off the public site, use "Pull from public" on its page, then resolve this report.'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {content ? (
                  <Button
                    variant="accent"
                    onClick={() => close('resolved', true)}
                    loading={busy === 'resolvedtrue'}
                    disabled={Boolean(busy)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove content and resolve
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    onClick={() => close('resolved')}
                    loading={busy === 'resolvedfalse'}
                    disabled={Boolean(busy)}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Mark resolved
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => close('dismissed')}
                  loading={busy === 'dismissedfalse'}
                  disabled={Boolean(busy)}
                >
                  Keep content and dismiss
                </Button>
                {r.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => close('under_review')}
                    disabled={Boolean(busy)}
                    className="text-[14px] text-muted underline underline-offset-4 hover:text-forest"
                  >
                    Mark under review
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="rounded-ctl bg-minty-50 p-4 text-[14px]">This report is closed.</p>
          )}
        </div>
        <Card as="aside" className="space-y-3 self-start p-6">
          <h2 className="text-[17px] font-bold">Moderation scope</h2>
          <p className="text-[14px] leading-relaxed text-muted">
            Reports are handled for spam, wrong information, and content that has nothing to do with
            tourist spots in Pampanga. Fact-checking beyond that is out of scope.
          </p>
        </Card>
      </div>
    </div>
  );
}
