import { useCallback, useEffect, useState } from 'react';
import { MapPinned, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { AccountStatusPill, VerificationPill } from '@/components/ui/Pill';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABELS } from '@/constants/status';
import { api } from '@/lib/api';
import { OfficerJurisdictionsModal } from './OfficerJurisdictionsModal';

const ROLE_FOR_TAB = {
  all: '',
  registered: 'registered_user',
  officers: 'tourism_officer',
  admins: 'administrator',
};

function jurisdictionText(jurisdictions) {
  if (jurisdictions === 'all') return 'All 22 jurisdictions';
  return jurisdictions?.length ? jurisdictions.join(', ') : 'No jurisdiction assigned';
}

export function UsersPage() {
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [officer, setOfficer] = useState(null);
  const [busy, setBusy] = useState(false);

  // Search waits until typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (ROLE_FOR_TAB[tab]) params.set('role', ROLE_FOR_TAB[tab]);
    if (q) params.set('q', q);
    setError('');
    return api(`/admin/users?${params}`)
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [tab, q]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = result?.counts || {};
  const tabs = [
    { value: 'all', label: 'All', count: Object.values(counts).reduce((a, b) => a + b, 0) },
    { value: 'registered', label: 'Registered', count: counts.registered_user || 0 },
    { value: 'officers', label: 'Officers', count: counts.tourism_officer || 0 },
    { value: 'admins', label: 'Administrators', count: counts.administrator || 0 },
  ];

  async function changeStatus() {
    setBusy(true);
    try {
      const status = confirm.accountStatus === 'active' ? 'suspended' : 'active';
      await api(`/admin/users/${confirm.id}/status`, { method: 'PATCH', body: { status } });
      toast.show(`${confirm.fullName} ${status === 'active' ? 'reinstated' : 'suspended'}.`);
      setConfirm(null);
      load();
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
            Users
          </h1>
          <p className="mt-1 text-[16px] text-muted">
            Accounts, roles, and identity verification across the platform.
          </p>
        </div>
        <SearchInput
          className="w-full max-w-sm"
          label="Search users"
          placeholder="Search by name or e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Account type" className="mt-6" />

      <Card className="mt-6 overflow-hidden">
        {!result && !error && (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-14 w-full" />
            ))}
          </div>
        )}
        {error && (
          <EmptyState icon={Users} title="Could not load users">
            {error}
          </EmptyState>
        )}
        {result && !result.users.length && <EmptyState icon={Users} title="No accounts match" />}
        {result?.users.length > 0 && (
          <ul className="divide-y divide-sage/70">
            {result.users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Avatar name={u.fullName} strong={u.role !== 'registered_user'} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-charcoal">{u.fullName}</p>
                  <p className="text-[13px] text-muted">
                    {ROLE_LABELS[u.role]}
                    {u.role === 'tourism_officer' && ` · ${jurisdictionText(u.jurisdictions)}`}
                    {u.role === 'registered_user' && u.homeAddress && ` · ${u.homeAddress}`}
                  </p>
                  <p className="text-[13px] text-muted">{u.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {u.role === 'registered_user' && <VerificationPill status={u.verification} />}
                  <AccountStatusPill status={u.accountStatus} />
                  {u.role === 'tourism_officer' && (
                    <Button variant="secondary" size="sm" onClick={() => setOfficer(u)}>
                      <MapPinned className="h-4 w-4" aria-hidden="true" />
                      Jurisdictions
                    </Button>
                  )}
                  {u.role !== 'administrator' && (
                    <Button variant="secondary" size="sm" onClick={() => setConfirm(u)}>
                      {u.accountStatus === 'active' ? 'Suspend' : 'Reinstate'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        size="sm"
        title={
          confirm?.accountStatus === 'active' ? 'Suspend this account?' : 'Reinstate this account?'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.accountStatus === 'active' ? 'danger' : 'primary'}
              onClick={changeStatus}
              loading={busy}
            >
              {confirm?.accountStatus === 'active' ? 'Suspend' : 'Reinstate'}
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-charcoal">
          {confirm?.accountStatus === 'active'
            ? `${confirm?.fullName} will be signed out and cannot log in or post until reinstated.`
            : `${confirm?.fullName} will be able to log in again.`}
        </p>
      </Modal>

      <OfficerJurisdictionsModal
        officer={officer}
        onClose={() => setOfficer(null)}
        onSaved={() => {
          setOfficer(null);
          load();
        }}
      />
    </div>
  );
}
