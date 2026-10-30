import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardSection } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Select, Textarea } from '@/components/ui/Form';
import { VerificationPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ID_TYPES } from '@/constants/options';
import { api } from '@/lib/api';
import { formatDate, formatPhone } from '@/lib/format';
import { cn } from '@/lib/cn';

const QUICK_REASONS = [
  'The photo is blurry or too dark to read.',
  'The name on the ID does not match the account name.',
  'The ID is expired.',
  'This is not a valid government ID.',
];

function Detail({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-sage/70 py-3 last:border-b-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px] text-charcoal">{children}</dd>
    </div>
  );
}

export function IdVerificationDetailPage() {
  const { userId } = useParams();
  const toast = useToast();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [idType, setIdType] = useState('');
  const [matches, setMatches] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError('');
    return api(`/admin/id-verifications/${userId}`)
      .then((data) => {
        setRecord(data);
        setIdType(data.idType || '');
      })
      .catch((err) => setError(err.message));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(decision) {
    setFormError('');
    if (decision === 'rejected' && reason.trim().length < 5) {
      setFormError('Tell the user why, so they can upload a better ID.');
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/id-verifications/${userId}/decision`, {
        method: 'POST',
        body: {
          decision,
          reason: decision === 'rejected' ? reason.trim() : undefined,
          idType: idType || undefined,
        },
      });
      toast.show(
        decision === 'verified'
          ? `${record.fullName} is now verified.`
          : 'ID rejected. The user was notified.',
      );
      setRejecting(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <EmptyState icon={ShieldCheck} title="Could not open this record">
        {error}
      </EmptyState>
    );
  }
  if (!record) return <Skeleton className="h-96 w-full" />;

  const pending = record.status === 'pending';
  const deleteDate = record.decidedAt
    ? new Date(new Date(record.decidedAt).getTime() + 24 * 3600 * 1000)
    : null;

  return (
    <div>
      <Link
        to="/admin/id-verification"
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-forest"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to verification records
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
            {record.fullName}
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Registered {formatDate(record.registeredAt)} · {record.idType} · {record.email}
          </p>
        </div>
        <VerificationPill status={record.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardSection title={`Submitted ID · ${record.idType}`}>
            {record.imageUrl ? (
              <img
                src={record.imageUrl}
                alt={`Submitted ${record.idType} for ${record.fullName}`}
                className="w-full rounded-ctl border border-sage object-contain"
              />
            ) : (
              <EmptyState
                icon={ImageOff}
                title={record.imageDeleted ? 'ID photo deleted' : 'ID photo unavailable'}
              >
                {record.imageDeleted
                  ? `Deleted 24 hours after the decision${deleteDate ? ` (${formatDate(deleteDate)})` : ''}. Only the status, ID type, verifying administrator, and date are kept.`
                  : record.imageError || 'The photo could not be loaded.'}
              </EmptyState>
            )}
            {record.imageUrl && (
              <p className="mt-3 text-[13px] text-muted">
                This view link expires in 5 minutes. Reload the page to see the photo again.
              </p>
            )}
          </CardSection>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardSection title="Account details">
              <dl>
                <Detail label="Full name on account">{record.fullName}</Detail>
                <Detail label="Contact number">{formatPhone(record.contactNumber)}</Detail>
                <Detail label="E-mail verified">{formatDate(record.emailVerifiedAt)}</Detail>
                <Detail label="Home address">{record.homeAddress || 'Not set yet'}</Detail>
                <Detail label="ID type">
                  {pending ? (
                    <Select
                      aria-label="ID type"
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                    >
                      {ID_TYPES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </Select>
                  ) : (
                    record.idType
                  )}
                </Detail>
              </dl>
            </CardSection>
          </Card>

          {pending ? (
            <Card>
              <CardSection title="Decision">
                <p className="text-[14px] text-muted">
                  Check that the ID is readable, not expired, and that the name matches the account.
                </p>
                <fieldset className="mt-4">
                  <legend className="text-[14px] font-semibold text-charcoal">
                    Does the name match the account?
                  </legend>
                  <div className="mt-2 flex gap-2">
                    {[
                      ['yes', 'Yes'],
                      ['no', 'No'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={matches === value}
                        onClick={() => {
                          setMatches(value);
                          if (value === 'no') {
                            setRejecting(true);
                            setReason(QUICK_REASONS[1]);
                          }
                        }}
                        className={cn(
                          'h-10 rounded-ctl border px-5 text-[14px] font-semibold',
                          matches === value
                            ? 'border-forest bg-forest text-white'
                            : 'border-sage bg-surface hover:bg-cream',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {rejecting && (
                  <div className="mt-5 space-y-3">
                    <Field label="Reason (sent to the user)" required>
                      {(props) => (
                        <Textarea
                          rows={3}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          {...props}
                        />
                      )}
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_REASONS.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => setReason(text)}
                          className="rounded-full border border-sage bg-cream px-3 py-1 text-[12px] hover:border-forest"
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formError && (
                  <p role="alert" className="mt-4 text-[14px] font-medium text-pin-700">
                    {formError}
                  </p>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  {!rejecting ? (
                    <>
                      <Button
                        onClick={() => decide('verified')}
                        loading={busy}
                        disabled={matches !== 'yes'}
                      >
                        Verify ID
                      </Button>
                      <Button variant="danger" onClick={() => setRejecting(true)}>
                        Reject
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="danger" onClick={() => decide('rejected')} loading={busy}>
                        Reject and notify user
                      </Button>
                      <Button variant="secondary" onClick={() => setRejecting(false)}>
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
                {!rejecting && matches !== 'yes' && (
                  <p className="mt-3 text-[13px] text-muted">
                    Answer &quot;Yes&quot; above to enable Verify ID.
                  </p>
                )}
              </CardSection>
            </Card>
          ) : (
            <Card>
              <CardSection title="Decision">
                <p className="text-[15px] text-charcoal">
                  {record.status === 'verified' ? 'Verified' : 'Rejected'} on{' '}
                  {formatDate(record.decidedAt)}
                  {record.decidedBy && ` by ${record.decidedBy}`}.
                </p>
                {record.note && (
                  <p className="mt-3 rounded-ctl bg-terracotta-50 px-4 py-3 text-[14px] text-terracotta-700">
                    {record.note}
                  </p>
                )}
              </CardSection>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
