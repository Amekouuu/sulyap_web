import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleAlert, CircleCheck, Loader2 } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';

// Opened from the e-mail link: /verify-email?token=...
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const { refresh } = useSession();
  const [state, setState] = useState({ status: 'checking' });
  const sent = useRef(false);

  useEffect(() => {
    // Run once, even when React renders the page twice in development.
    if (sent.current) return;
    sent.current = true;
    const token = params.get('token') || '';
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(async (data) => {
        const user = await refresh();
        setState({ status: data.status, signedIn: Boolean(user) });
      })
      .catch((error) => setState({ status: 'failed', message: error.message }));
  }, [params, refresh]);

  if (state.status === 'checking') {
    return (
      <p role="status" className="flex items-center gap-3 text-[16px] text-muted">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Checking your link...
      </p>
    );
  }

  if (state.status === 'failed') {
    return (
      <div>
        <CircleAlert className="h-10 w-10 text-terracotta" aria-hidden="true" />
        <h1 className="mt-4 text-[36px] font-extrabold leading-tight text-forest">
          This link did not work
        </h1>
        <p className="mt-2 text-[16px] text-muted">{state.message}</p>
        <ButtonLink to="/check-email" className="mt-6">
          Get a new link
        </ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <CircleCheck className="h-10 w-10 text-forest" aria-hidden="true" />
      <h1 className="mt-4 text-[36px] font-extrabold leading-tight text-forest">
        {state.status === 'already_verified'
          ? 'Your e-mail is already verified'
          : 'E-mail verified'}
      </h1>
      <p className="mt-2 text-[16px] text-muted">
        Next, upload a valid ID. Once an administrator verifies it, you can post reviews, photos,
        and nominations.
      </p>
      <ButtonLink
        to={state.signedIn ? '/upload-id' : '/login?next=/upload-id'}
        className="mt-6"
        size="lg"
      >
        {state.signedIn ? 'Continue: upload your ID' : 'Log in to continue'}
      </ButtonLink>
    </div>
  );
}
