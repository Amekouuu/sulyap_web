import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeLocationForm } from '@/components/account/HomeLocationForm';
import { Button } from '@/components/ui/Button';
import { Card, CardSection } from '@/components/ui/Card';
import { Checkbox, Field, Input } from '@/components/ui/Form';
import { VerificationPill } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABELS } from '@/constants/status';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import { cn } from '@/lib/cn';

function Detail({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-sage/70 py-3 last:border-b-0 sm:grid-cols-[200px_1fr]">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px] text-charcoal">{children}</dd>
    </div>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(event) {
    event.preventDefault();
    const found = {};
    if (!form.currentPassword) found.currentPassword = 'Enter your current password.';
    if (form.newPassword.length < 8) found.newPassword = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.newPassword) || !/\d/.test(form.newPassword)) {
      found.newPassword = 'Use at least one letter and one number.';
    }
    if (form.confirm !== form.newPassword) found.confirm = 'The passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await api('/account/password', {
        method: 'POST',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.show('Password changed.');
    } catch (err) {
      const field = err.code === 'wrong_password' ? 'currentPassword' : 'newPassword';
      setErrors({ [field]: err.message });
    } finally {
      setBusy(false);
    }
  }

  const input = (key, label, autoComplete) => (
    <Field label={label} error={errors[key]}>
      {(props) => (
        <Input
          type="password"
          autoComplete={autoComplete}
          value={form[key]}
          onChange={set(key)}
          {...props}
        />
      )}
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-4">
      {input('currentPassword', 'Current password', 'current-password')}
      {input('newPassword', 'New password', 'new-password')}
      {input('confirm', 'Confirm new password', 'new-password')}
      <p className="text-[13px] text-muted">At least 8 characters, with a letter and a number.</p>
      <Button type="submit" loading={busy}>
        Change password
      </Button>
    </form>
  );
}

// Home location for Nearby Lesser-Known: set, change, or remove.
function HomeLocationSection() {
  const { user, setUser } = useSession();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const data = await api('/account/home', { method: 'DELETE' });
      setUser(data.user);
      toast.show('Home location removed.');
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <CardSection title="Home location">
      {editing ? (
        <HomeLocationForm onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[14px] text-muted">
            Used only by Nearby Lesser-Known on the Map to list endorsed places within 5, 10, or 20
            km. Other users never see it.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              {user.hasHomeLocation ? 'Change home location' : 'Set home location'}
            </Button>
            {user.hasHomeLocation && (
              <Button variant="ghost" loading={busy} onClick={remove}>
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </CardSection>
  );
}

// Account Settings for every role. Registered Users also see their ID status, home location,
// and newsletter choice. contained: add page padding (public pages).
export function AccountSettingsPage({ contained = true }) {
  const { user, setUser } = useSession();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const registered = user.role === 'registered_user';

  async function toggleNewsletter(event) {
    setSaving(true);
    try {
      const data = await api('/account/settings', {
        method: 'PATCH',
        body: { newsletterOptIn: event.target.checked },
      });
      setUser(data.user);
      toast.show(
        data.user.newsletterOptIn
          ? 'You will get the monthly newsletter.'
          : 'Newsletter turned off.',
      );
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn(contained && 'mx-auto max-w-page px-5 py-12 sm:px-8')}>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Account settings
      </h1>
      <Card className="mt-8 max-w-3xl">
        <CardSection title="Your account">
          <dl>
            <Detail label="Name">{user.fullName}</Detail>
            <Detail label="E-mail">{user.email}</Detail>
            {user.contactNumber && (
              <Detail label="Contact number">{formatPhone(user.contactNumber)}</Detail>
            )}
            <Detail label="Account type">{ROLE_LABELS[user.role]}</Detail>
            {registered && (
              <Detail label="ID verification">
                <span className="flex flex-wrap items-center gap-3">
                  <VerificationPill status={user.verification} />
                  {['no_id', 'rejected'].includes(user.verification) && (
                    <Link
                      to="/upload-id"
                      className="text-[14px] font-semibold text-forest underline"
                    >
                      Upload your ID
                    </Link>
                  )}
                  {user.verification === 'email_unverified' && (
                    <Link
                      to="/check-email"
                      className="text-[14px] font-semibold text-forest underline"
                    >
                      Verify your e-mail
                    </Link>
                  )}
                </span>
              </Detail>
            )}
            {registered && (
              <Detail label="Home location">
                {user.homeAddress ||
                  (user.hasHomeLocation
                    ? 'Set with a pin on the map'
                    : 'Not set. You will be asked the first time you use Nearby Lesser-Known.')}
              </Detail>
            )}
          </dl>
        </CardSection>
        {registered && <HomeLocationSection />}
        {registered && (
          <CardSection title="Newsletter">
            <Checkbox
              checked={user.newsletterOptIn}
              disabled={saving}
              onChange={toggleNewsletter}
              label="Send me the monthly newsletter of newly endorsed destinations."
              description="Account and submission notices are always sent; only the newsletter is optional."
            />
          </CardSection>
        )}
        <CardSection title="Change password">
          <ChangePassword />
        </CardSection>
      </Card>
    </div>
  );
}
