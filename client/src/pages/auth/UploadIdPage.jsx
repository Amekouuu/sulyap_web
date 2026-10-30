import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CircleAlert, Clock, ShieldCheck } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Form';
import { PhotoUploader } from '@/components/ui/PhotoUploader';
import { ID_TYPES } from '@/constants/options';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';

function Heading({ icon: Icon, title, children }) {
  return (
    <div>
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-minty-50 text-forest">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        {title}
      </h1>
      <div className="mt-3 text-[16px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}

// Step 3 of sign-up: the front photo of one valid government ID.
export function UploadIdPage() {
  const { user, setUser } = useSession();
  const [idType, setIdType] = useState('');
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user.role !== 'registered_user') return <Navigate to="/" replace />;
  if (user.verification === 'email_unverified') return <Navigate to="/check-email" replace />;

  if (user.verification === 'pending') {
    return (
      <Heading icon={Clock} title="Your ID is being reviewed">
        <p>An administrator will check it soon. We will notify you by e-mail and in the app.</p>
        <ButtonLink to="/" className="mt-6">
          Keep browsing
        </ButtonLink>
      </Heading>
    );
  }
  if (user.verification === 'verified') {
    return (
      <Heading icon={ShieldCheck} title="Your account is verified">
        <p>You can post reviews, ratings, photos, reports, and nominations.</p>
        <ButtonLink to="/" className="mt-6">
          Start exploring
        </ButtonLink>
      </Heading>
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    const found = {};
    if (!idType) found.idType = 'Choose the type of ID.';
    if (!photos.length) found.photo = 'Add a photo of the front of your ID.';
    setErrors(found);
    if (Object.keys(found).length) return;
    const form = new FormData();
    form.append('idType', idType);
    form.append('photo', photos[0].file);
    setBusy(true);
    try {
      const data = await api('/account/id', { method: 'POST', body: form });
      setUser(data.user);
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Heading icon={ShieldCheck} title="Upload your valid ID">
        <p>
          An administrator checks that the name matches your account. Then you can start posting.
        </p>
      </Heading>
      {user.verification === 'rejected' && user.verificationNote && (
        <p
          role="alert"
          className="mt-6 flex gap-3 rounded-ctl bg-terracotta-50 px-4 py-3 text-[14px] text-terracotta-700"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{user.verificationNote}</span>
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
        <Field label="Type of ID" required error={errors.idType}>
          {(props) => (
            <Select value={idType} onChange={(e) => setIdType(e.target.value)} {...props}>
              <option value="" disabled>
                Select your ID
              </option>
              {ID_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </Select>
          )}
        </Field>
        <div>
          <p className="mb-2 text-[14px] font-semibold text-charcoal">
            Front of your ID{' '}
            <span className="text-pin" aria-hidden="true">
              *
            </span>
          </p>
          <PhotoUploader
            value={photos}
            onChange={setPhotos}
            max={1}
            label="Add ID photo"
            invalid={Boolean(errors.photo)}
          />
          {errors.photo && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-pin-700">
              {errors.photo}
            </p>
          )}
        </div>
        <p className="rounded-ctl bg-minty-50 px-4 py-3 text-[13px] leading-relaxed text-forest">
          Only an administrator can see this photo. It is permanently deleted 24 hours after the
          decision, and your ID number is never stored.
        </p>
        {errors.form && (
          <p
            role="alert"
            className="rounded-ctl bg-pin-50 px-4 py-3 text-[14px] font-medium text-pin-700"
          >
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Submit for verification
        </Button>
      </form>
    </div>
  );
}
