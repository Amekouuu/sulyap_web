import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input } from '@/components/ui/Form';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';

const EMPTY = {
  fullName: '',
  email: '',
  contactNumber: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  newsletterOptIn: false,
};

// Quick checks for instant feedback. The server checks everything again.
function check(form) {
  const errors = {};
  if (form.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid e-mail address.';
  if (!/^(09\d{9}|\+?639\d{9})$/.test(form.contactNumber.replace(/[\s().-]/g, ''))) {
    errors.contactNumber = 'Enter a mobile number like 0917 123 4567.';
  }
  if (form.password.length < 8) errors.password = 'Use at least 8 characters.';
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = 'Use at least one letter and one number.';
  }
  if (form.confirmPassword !== form.password)
    errors.confirmPassword = 'The passwords do not match.';
  if (!form.acceptTerms) errors.acceptTerms = 'Please agree to continue.';
  return errors;
}

export function SignupPage() {
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) =>
    setForm({
      ...form,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });

  async function onSubmit(event) {
    event.preventDefault();
    setFormError('');
    const found = check(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const { confirmPassword: _confirm, ...body } = form;
      const data = await api('/auth/register', { method: 'POST', body });
      setUser(data.user);
      navigate('/check-email', { replace: true });
    } catch (err) {
      const fieldErrors = Object.fromEntries((err.details || []).map((d) => [d.field, d.message]));
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const text = (key, label, props = {}) => (
    <Field label={label} required error={errors[key]}>
      {(fieldProps) => <Input value={form[key]} onChange={set(key)} {...props} {...fieldProps} />}
    </Field>
  );

  return (
    <div>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Create an account
      </h1>
      <p className="mt-2 text-[16px] text-muted">
        You need one to write reviews and nominate destinations. After you confirm your e-mail, you
        upload a valid ID; posting unlocks once an administrator verifies it.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {text('fullName', 'Full name', { autoComplete: 'name', placeholder: 'Ex: Juan Dela Cruz' })}
        <div className="grid gap-5 sm:grid-cols-2">
          {text('email', 'E-mail', {
            type: 'email',
            autoComplete: 'email',
            placeholder: 'Ex: juan@email.com',
          })}
          {text('contactNumber', 'Contact number', {
            type: 'tel',
            autoComplete: 'tel',
            placeholder: 'Ex: 0917 123 4567',
          })}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {text('password', 'Password', { type: 'password', autoComplete: 'new-password' })}
          {text('confirmPassword', 'Confirm password', {
            type: 'password',
            autoComplete: 'new-password',
          })}
        </div>
        <p className="text-[13px] text-muted">At least 8 characters, with a letter and a number.</p>
        <div className="space-y-3">
          <Checkbox
            checked={form.acceptTerms}
            onChange={set('acceptTerms')}
            aria-invalid={errors.acceptTerms ? true : undefined}
            label="I agree to the Terms of Use and to the collection and processing of my personal information as described in the Data Privacy Notice, in line with the Data Privacy Act of 2012 (RA 10173)."
            description="Business owners may not nominate or review their own businesses."
          />
          {errors.acceptTerms && (
            <p role="alert" className="text-[13px] font-medium text-pin-700">
              {errors.acceptTerms}
            </p>
          )}
          <Checkbox
            checked={form.newsletterOptIn}
            onChange={set('newsletterOptIn')}
            label="Send me the monthly newsletter of newly endorsed destinations. You can turn this off any time."
          />
        </div>
        {formError && (
          <p
            role="alert"
            className="rounded-ctl bg-pin-50 px-4 py-3 text-[14px] font-medium text-pin-700"
          >
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Sign up
        </Button>
      </form>
      <p className="mt-6 text-center text-[15px]">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-forest underline underline-offset-2">
          Log in
        </Link>
      </p>
    </div>
  );
}
