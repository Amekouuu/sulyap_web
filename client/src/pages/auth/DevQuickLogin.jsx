import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ROLE_LABELS } from '@/constants/status';

const STATE_LABEL = {
  verified: 'ID verified',
  pending: 'ID pending',
  rejected: 'ID rejected',
  no_id: 'no ID yet',
  email_unverified: 'e-mail not verified',
};

// Development only (server ENABLE_DEV_LOGIN=true): sign in as a seeded or test account
// without typing its password. The server refuses this in production.
export function DevQuickLogin({ onLoggedIn }) {
  const [accounts, setAccounts] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    api('/dev/accounts')
      .then((data) =>
        setAccounts(data.enabled ? data.accounts.filter((a) => a.accountStatus === 'active') : []),
      )
      .catch(() => setAccounts([]));
  }, []);

  if (!accounts.length) return null;

  async function loginAs(email) {
    setBusy(email);
    try {
      const data = await api('/dev/login-as', { method: 'POST', body: { email } });
      onLoggedIn(data.user);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8 rounded-panel border border-sage bg-surface p-5">
      <p className="font-mono text-[12px] uppercase tracking-wide text-muted">
        Development · open an account
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {accounts.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={busy !== null}
            onClick={() => loginAs(a.email)}
            title={a.email}
            className="rounded-ctl border border-sage bg-cream px-3 py-2 text-left text-[13px] hover:border-forest disabled:opacity-50"
          >
            <span className="block font-semibold text-charcoal">{a.fullName}</span>
            <span className="block text-[12px] text-muted">
              {ROLE_LABELS[a.role]}
              {a.role === 'registered_user' &&
                ` · ${STATE_LABEL[a.verification] || a.verification}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
