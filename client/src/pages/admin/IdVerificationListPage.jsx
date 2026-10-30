import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { VerificationPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

export function IdVerificationListPage() {
  const [status, setStatus] = useState('pending');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setResult(null);
    setError('');
    api(`/admin/id-verifications?status=${status}`)
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [status]);

  const counts = result?.counts || {};
  const tabs = [
    { value: 'pending', label: 'Pending review', count: counts.pending || 0 },
    { value: 'verified', label: 'ID verified', count: counts.verified || 0 },
    { value: 'rejected', label: 'Rejected', count: counts.rejected || 0 },
    { value: 'all', label: 'All', count: Object.values(counts).reduce((a, b) => a + b, 0) },
  ];

  return (
    <div>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        ID Verification
      </h1>
      <p className="mt-1 max-w-3xl text-[16px] text-muted">
        Registered users upload a valid ID after confirming their e-mail. They can post reviews,
        photos, reports, and nominations only after their ID is verified.
      </p>
      <Tabs
        tabs={tabs}
        value={status}
        onChange={setStatus}
        label="Verification status"
        className="mt-6"
      />
      <h2 className="mt-8 text-[20px] font-bold text-forest">Verification records</h2>
      <Card className="mt-3 overflow-hidden">
        {!result && !error && (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-12 w-full" />
            ))}
          </div>
        )}
        {error && (
          <EmptyState icon={ShieldCheck} title="Could not load records">
            {error}
          </EmptyState>
        )}
        {result && !result.records.length && (
          <EmptyState
            icon={ShieldCheck}
            title={status === 'pending' ? 'No IDs waiting for review' : 'No records here'}
          />
        )}
        {result?.records.length > 0 && (
          <ul className="divide-y divide-sage/70">
            {result.records.map((r) => (
              <li key={r.userId}>
                <Link
                  to={`/admin/id-verification/${r.userId}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-cream"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-charcoal">{r.fullName}</p>
                    <p className="text-[13px] text-muted">
                      Registered {formatDate(r.registeredAt)} · {r.idType || 'ID type not set'} ·{' '}
                      {r.email}
                    </p>
                  </div>
                  <VerificationPill status={r.status} />
                  <ChevronRight className="h-5 w-5 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
