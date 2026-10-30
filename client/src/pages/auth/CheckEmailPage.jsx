import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';

const WAIT_SECONDS = 60;

// Shown after sign-up: tells the user to open the link in their inbox, with a resend button.
export function CheckEmailPage() {
  const { user } = useSession();
  const [email, setEmail] = useState('');
  const [wait, setWait] = useState(WAIT_SECONDS);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  if (user && user.verification !== 'email_unverified') {
    return <Navigate to={user.role === 'registered_user' ? '/upload-id' : '/'} replace />;
  }

  async function resend() {
    setMessage('');
    setError('');
    setBusy(true);
    try {
      await api('/auth/resend-verification', { method: 'POST', body: user ? {} : { email } });
      setMessage('A new link is on its way. Check your inbox and spam folder.');
      setWait(WAIT_SECONDS);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-minty-50 text-forest">
        <MailCheck className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Check your inbox
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed text-muted">
        {user ? (
          <>
            We sent a verification link to <strong className="text-charcoal">{user.email}</strong>.
          </>
        ) : (
          'We sent a verification link to the e-mail you signed up with.'
        )}{' '}
        Open it to confirm your address. The link works for 24 hours.
      </p>
      <div className="mt-8 space-y-4 rounded-panel border border-sage bg-surface p-6">
        <p className="text-[15px] font-semibold">Did not get it?</p>
        <p className="text-[14px] text-muted">Check your spam folder, or ask for a new link.</p>
        {!user && (
          <Field label="Your e-mail">
            {(props) => (
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...props}
              />
            )}
          </Field>
        )}
        <Button
          variant="secondary"
          onClick={resend}
          loading={busy}
          disabled={wait > 0 || (!user && !email)}
        >
          {wait > 0 ? `Send a new link in ${wait}s` : 'Send a new link'}
        </Button>
        <p role="status" className="text-[14px] text-forest">
          {message}
        </p>
        {error && (
          <p role="alert" className="text-[14px] font-medium text-pin-700">
            {error}
          </p>
        )}
      </div>
      {import.meta.env.DEV && (
        <p className="mt-6 text-[14px] text-muted">
          Development: e-mails are not really sent.{' '}
          <Link to="/dev/outbox" className="font-semibold text-forest underline">
            Open the dev outbox
          </Link>
        </p>
      )}
    </div>
  );
}
