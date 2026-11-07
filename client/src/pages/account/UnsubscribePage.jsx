import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailX } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';

// One-click unsubscribe from the newsletter link. Works without logging in. The request is sent
// from the page (not the link itself) so e-mail scanners that open links do not unsubscribe anyone.
export function UnsubscribePage() {
  const [params] = useSearchParams();
  const { user, refresh } = useSession();
  const [state, setState] = useState({ status: 'working' });

  useEffect(() => {
    let cancelled = false;
    api('/newsletter/unsubscribe', {
      method: 'POST',
      body: { u: params.get('u'), t: params.get('t') || '' },
    })
      .then(() => {
        if (cancelled) return;
        setState({ status: 'done' });
        if (user) refresh();
      })
      .catch((err) => !cancelled && setState({ status: 'error', message: err.message }));
    return () => {
      cancelled = true;
    };
    // Runs once for the link that was opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-page px-5 py-12 sm:px-8">
      <Card className="mx-auto max-w-xl">
        <EmptyState
          icon={MailX}
          title={
            state.status === 'working'
              ? 'Unsubscribing…'
              : state.status === 'done'
                ? 'You are unsubscribed'
                : 'This link did not work'
          }
        >
          {state.status === 'done' && (
            <>
              You will no longer get the monthly newsletter. Notices about your account and
              submissions are still sent. You can turn the newsletter back on in{' '}
              <Link to="/account" className="font-semibold text-forest underline">
                Account Settings
              </Link>
              .
            </>
          )}
          {state.status === 'error' && (
            <>
              {state.message} You can turn the newsletter off in{' '}
              <Link to="/account" className="font-semibold text-forest underline">
                Account Settings
              </Link>{' '}
              instead.
            </>
          )}
        </EmptyState>
      </Card>
    </div>
  );
}
