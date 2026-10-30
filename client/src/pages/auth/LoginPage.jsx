import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { homePathFor, safeNextPath, useSession } from '@/session/SessionContext';
import { DevQuickLogin } from './DevQuickLogin';

export function LoginPage() {
  const { login, setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function goOn(user) {
    const next = safeNextPath(params.get('next'));
    const needsSetup = ['email_unverified', 'no_id'].includes(user.verification);
    navigate(next && !needsSetup ? next : homePathFor(user), { replace: true });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) {
      setError('Enter your e-mail and password.');
      return;
    }
    setBusy(true);
    try {
      goOn(await login(form.email, form.password));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Log in
      </h1>
      <p className="mt-2 text-[16px] text-muted">
        Browsing does not need an account. Log in to review, nominate, or moderate.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field label="E-mail">
          {(props) => (
            <Input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              {...props}
            />
          )}
        </Field>
        <Field label="Password">
          {(props) => (
            <Input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              {...props}
            />
          )}
        </Field>
        {error && (
          <p
            role="alert"
            className="rounded-ctl bg-pin-50 px-4 py-3 text-[14px] font-medium text-pin-700"
          >
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Log in
        </Button>
      </form>
      <div className="mt-8 space-y-3 border-t border-sage pt-6 text-[15px]">
        <p>
          Just looking around?{' '}
          <Link to="/" className="font-semibold text-forest underline underline-offset-2">
            Continue without an account
          </Link>
        </p>
        <p>
          No account yet?{' '}
          <Link to="/signup" className="font-semibold text-forest underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
      <DevQuickLogin
        onLoggedIn={(user) => {
          setUser(user);
          goOn(user);
        }}
      />
    </div>
  );
}
