import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Info, MapPin, Send, Star, Trash2 } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { PhotoUploader } from '@/components/ui/PhotoUploader';
import { WorkflowPill } from '@/components/ui/Pill';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { CATEGORIES } from '@/constants/categories';
import { JURISDICTIONS } from '@/constants/jurisdictions';
import { PHOTO_RULES } from '@/constants/options';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApi } from '@/lib/useApi';

const PinPicker = lazy(() => import('@/components/map/PinPicker'));
const CHECK_DELAY_MS = 600;
const EDITABLE = ['draft', 'returned'];

const EMPTY = {
  name: '',
  jurisdictionId: '',
  pin: null,
  location: '',
  description: '',
  categories: [],
  entranceFee: '',
  bestTimeToVisit: '',
  operatingHours: '',
  safetyReminders: '',
};

function fromServer(n) {
  return {
    name: n.name,
    jurisdictionId: String(n.jurisdictionId),
    pin: { latitude: n.latitude, longitude: n.longitude },
    location: n.location || '',
    description: n.description || '',
    categories: n.categories,
    entranceFee: n.entranceFee || '',
    bestTimeToVisit: n.bestTimeToVisit || '',
    operatingHours: n.operatingHours || '',
    safetyReminders: n.safetyReminders || '',
  };
}

function toServer(form) {
  return {
    name: form.name,
    jurisdictionId: Number(form.jurisdictionId),
    latitude: form.pin?.latitude,
    longitude: form.pin?.longitude,
    location: form.location,
    description: form.description,
    categories: form.categories,
    entranceFee: form.entranceFee || null,
    bestTimeToVisit: form.bestTimeToVisit || null,
    operatingHours: form.operatingHours || null,
    safetyReminders: form.safetyReminders || null,
  };
}

// Field errors from the server ({ field, message }) keyed by our form names.
function fieldErrorsFrom(error) {
  const out = {};
  for (const d of Array.isArray(error?.details) ? error.details : []) {
    const key = d.field === 'latitude' || d.field === 'longitude' ? 'pin' : d.field;
    out[key] ||= d.message;
  }
  return out;
}

function NotVerified() {
  return (
    <div className="mx-auto max-w-[760px] px-5 py-16 sm:px-8">
      <Card>
        <EmptyState
          icon={Info}
          title="Verify your ID to nominate"
          action={<ButtonLink to="/account">Go to Account Settings</ButtonLink>}
        >
          Nominations, reviews, photos, and reports need a verified e-mail address and a verified
          ID. The yellow bar at the top of the page shows your next step.
        </EmptyState>
      </Card>
    </div>
  );
}

// Warnings from the duplicate and already-promoted checks.
function MatchList({ duplicates = [], known = [] }) {
  return (
    <div className="space-y-4 text-[14px]">
      {duplicates.length > 0 && (
        <div>
          <p className="font-semibold">Similar places already on Sulyap in this town</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {duplicates.map((d) => (
              <li key={d.id}>
                {d.endorsed ? (
                  <Link
                    to={`/destinations/${d.id}`}
                    target="_blank"
                    className="text-forest underline"
                  >
                    {d.name}
                  </Link>
                ) : (
                  <span>
                    {d.name} <span className="text-muted">(another nomination under review)</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {known.length > 0 && (
        <div>
          <p className="font-semibold">Already promoted elsewhere</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            {known.map((k) => (
              <li key={k.id}>{k.name}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-muted">
            Sulyap is for places that are not widely promoted yet. The Local Tourism Officer makes
            the final decision.
          </p>
        </div>
      )}
    </div>
  );
}

export function NominatePage() {
  const { destinationId } = useParams();
  const editing = Boolean(destinationId);
  const { user } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const towns = useApi('/jurisdictions');
  const existing = useApi(editing ? `/nominations/${destinationId}` : null);

  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(null); // the nomination as last saved on the server
  const [newPhotos, setNewPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null); // { title, body }
  const [busy, setBusy] = useState(null); // 'draft' | 'submit' | 'photo'
  const [warnings, setWarnings] = useState(null); // live check result
  const [confirm, setConfirm] = useState(null); // matches waiting for "Submit anyway"
  const [focus, setFocus] = useState(null);

  // Load the nomination once when editing.
  useEffect(() => {
    if (existing.data) {
      setForm(fromServer(existing.data));
      setSaved(existing.data);
    }
  }, [existing.data]);

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const onText = (key) => (event) => set(key)(event.target.value);

  const townName = useMemo(
    () => towns.data?.jurisdictions.find((j) => String(j.id) === form.jurisdictionId)?.name,
    [towns.data, form.jurisdictionId],
  );

  // Fly the map to the town when it is chosen and there is no pin yet.
  useEffect(() => {
    const center = JURISDICTIONS.find((j) => j.name === townName);
    if (center && !form.pin) setFocus({ lat: center.lat, lng: center.lng });
    // Only when the town changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [townName]);

  // Check for duplicates and already-promoted places while the name is being typed.
  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 3 || !form.jurisdictionId) {
      setWarnings(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      api('/nominations/check', {
        method: 'POST',
        body: {
          name,
          jurisdictionId: Number(form.jurisdictionId),
          ...(saved ? { excludeId: saved.id } : {}),
        },
      })
        .then(setWarnings)
        .catch(() => setWarnings(null));
    }, CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [form.name, form.jurisdictionId, saved]);

  if (user && !user.canContribute) return <NotVerified />;
  if (editing && existing.error) {
    return (
      <div className="mx-auto max-w-[760px] px-5 py-16 sm:px-8">
        <EmptyState
          icon={Info}
          title="Nomination not found"
          action={<ButtonLink to="/contribute/nominations">My Nominations</ButtonLink>}
        />
      </div>
    );
  }
  if ((editing && !saved) || !towns.data) {
    return (
      <div className="mx-auto max-w-[960px] space-y-4 px-5 py-12 sm:px-8">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  const locked = saved && !EDITABLE.includes(saved.status);
  const savedPhotos = saved?.photos || [];
  const photoRoom = PHOTO_RULES.nomination.max - savedPhotos.length;

  function draftProblems() {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter the name of the destination.';
    if (!form.jurisdictionId) e.jurisdictionId = 'Choose the city or municipality.';
    if (!form.pin) e.pin = 'Place a pin on the map.';
    return e;
  }

  // Saves the fields, then uploads any new photos. Returns the saved nomination.
  async function save() {
    const problems = draftProblems();
    if (Object.keys(problems).length) {
      setErrors(problems);
      throw new Error('Fill in the name, the city or municipality, and the map pin first.');
    }
    let result = saved
      ? await api(`/nominations/${saved.id}`, { method: 'PUT', body: toServer(form) })
      : await api('/nominations', { method: 'POST', body: toServer(form) });
    // Remember the saved copy right away, so a failed photo upload does not create a second draft.
    setSaved(result);
    if (newPhotos.length) {
      const data = new FormData();
      newPhotos.forEach((p) => data.append('photos', p.file));
      result = await api(`/nominations/${result.id}/photos`, { method: 'POST', body: data });
      newPhotos.forEach((p) => URL.revokeObjectURL(p.url));
      setNewPhotos([]);
      setSaved(result);
    }
    // Point the address at the edit page without reloading the form (an open dialog or error
    // message would otherwise be lost). Later saves use `saved`, so they update this draft.
    if (!editing)
      window.history.replaceState(window.history.state, '', `/nominate/${result.id}/edit`);
    return result;
  }

  function showError(error) {
    setErrors((e) => ({ ...e, ...fieldErrorsFrom(error) }));
    setBanner(
      error.code === 'prohibited_terms'
        ? {
            title: 'Remove the words that are not allowed',
            body: `Found: ${error.details?.terms?.join(', ')}. Edit the text and submit again.`,
          }
        : { title: 'Please check the form', body: error.message },
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveDraft() {
    setBusy('draft');
    setBanner(null);
    try {
      await save();
      toast.show('Draft saved. You can finish it later from My Nominations.');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(null);
    }
  }

  async function submit(confirmWarnings = false) {
    setBusy('submit');
    setBanner(null);
    try {
      const current = await save();
      await api(`/nominations/${current.id}/submit`, {
        method: 'POST',
        body: { confirmWarnings },
      });
      toast.show('Nomination submitted. An administrator will screen it first.');
      navigate('/contribute/nominations');
    } catch (error) {
      if (error.code === 'needs_confirmation') setConfirm(error.details);
      else showError(error);
    } finally {
      setBusy(null);
    }
  }

  async function photoAction(path, method) {
    setBusy('photo');
    try {
      setSaved(await api(`/nominations/${saved.id}/photos/${path}`, { method }));
    } catch (error) {
      toast.show(error.message, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function deleteDraft() {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    try {
      await api(`/nominations/${saved.id}`, { method: 'DELETE' });
      toast.show('Draft deleted.');
      navigate('/contribute/nominations');
    } catch (error) {
      toast.show(error.message, { tone: 'error' });
    }
  }

  const hasWarnings = warnings && (warnings.duplicates.length || warnings.known.length);

  return (
    <div className="mx-auto max-w-[960px] px-5 py-10 sm:px-8 xl:py-12">
      <Link
        to="/contribute/nominations"
        className="inline-flex items-center gap-2 text-[14px] font-semibold text-muted hover:text-forest"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        My Nominations
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest sm:text-[48px]">
            {editing ? 'Edit nomination' : 'Nominate a destination'}
          </h1>
          <p className="mt-2 max-w-2xl text-[16px] text-muted">
            Tell us about a place in Pampanga that deserves more visitors. An administrator screens
            it first, then the Local Tourism Officer for that city or municipality decides.
          </p>
        </div>
        {saved && <WorkflowPill status={saved.status} />}
      </div>

      {saved?.status === 'returned' && saved.lastDecision?.remarks && (
        <div className="mt-6 rounded-panel border border-terracotta/30 bg-terracotta-50 p-5 text-[15px]">
          <p className="font-semibold text-terracotta-700">Returned for changes</p>
          <p className="mt-1 whitespace-pre-line">{saved.lastDecision.remarks}</p>
          <p className="mt-2 text-[13px] text-muted">Fix the points above, then submit again.</p>
        </div>
      )}
      {locked && (
        <div className="mt-6 rounded-panel border border-sage bg-surface p-5 text-[15px]">
          This nomination is being reviewed, so it can no longer be changed.
        </div>
      )}
      {banner && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-panel border border-pin/30 bg-pin-50 p-5 text-[15px]"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-pin-700" aria-hidden="true" />
          <div>
            <p className="font-semibold text-pin-700">{banner.title}</p>
            <p className="mt-1">{banner.body}</p>
          </div>
        </div>
      )}

      <fieldset disabled={locked || Boolean(busy)} className="mt-8 min-w-0 space-y-8">
        <Card className="space-y-6 p-6 sm:p-8">
          <h2 className="text-[20px] font-extrabold text-forest">The place</h2>
          <Field label="Name of the destination" required error={errors.name}>
            {(props) => (
              <Input
                {...props}
                value={form.name}
                onChange={onText('name')}
                maxLength={150}
                placeholder="For example: Sitio Target Falls"
              />
            )}
          </Field>
          {hasWarnings ? (
            <div
              aria-live="polite"
              className="-mt-3 rounded-ctl border border-gold/40 bg-gold-100 p-4"
            >
              <p className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-gold-700">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                This place may already be listed
              </p>
              <MatchList duplicates={warnings.duplicates} known={warnings.known} />
            </div>
          ) : null}
          <Field label="City or municipality" required error={errors.jurisdictionId}>
            {(props) => (
              <Select {...props} value={form.jurisdictionId} onChange={onText('jurisdictionId')}>
                <option value="">Choose one</option>
                {towns.data.jurisdictions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="space-y-2">
            <p className="text-[14px] font-semibold">
              Location on the map{' '}
              <span className="text-pin" aria-hidden="true">
                *
              </span>
            </p>
            <p className="text-[13px] text-muted">
              Click or tap the exact spot. Drag the pin to adjust it. Only places inside Pampanga
              can be pinned.
            </p>
            <Suspense fallback={<Skeleton className="h-[380px] w-full" />}>
              <PinPicker
                value={form.pin}
                focus={focus}
                onChange={set('pin')}
                onOutside={() =>
                  setErrors((e) => ({ ...e, pin: 'That spot is outside Pampanga.' }))
                }
                className={cn('h-[340px] sm:h-[400px]', errors.pin && 'ring-2 ring-pin')}
              />
            </Suspense>
            <p className="flex items-center gap-2 text-[13px] text-muted" aria-live="polite">
              <MapPin className="h-4 w-4 text-pin" aria-hidden="true" />
              {form.pin
                ? `Pinned at ${form.pin.latitude.toFixed(5)}, ${form.pin.longitude.toFixed(5)}`
                : 'No pin yet'}
            </p>
            {errors.pin && (
              <p role="alert" className="text-[13px] font-medium text-pin-700">
                {errors.pin}
              </p>
            )}
          </div>

          <Field
            label="Address or directions"
            required
            hint="Barangay, street, or landmarks that help visitors find it."
            error={errors.location}
          >
            {(props) => (
              <Input
                {...props}
                value={form.location}
                onChange={onText('location')}
                maxLength={255}
              />
            )}
          </Field>
          <Field
            label="Description"
            required
            hint="What is there to see or do? At least 30 characters."
            error={errors.description}
          >
            {(props) => (
              <Textarea
                {...props}
                rows={5}
                value={form.description}
                onChange={onText('description')}
                maxLength={5000}
              />
            )}
          </Field>
          <fieldset>
            <legend className="text-[14px] font-semibold">
              Categories{' '}
              <span className="text-pin" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map(({ name, icon: Icon }) => {
                const on = form.categories.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set('categories')(
                        on ? form.categories.filter((c) => c !== name) : [...form.categories, name],
                      )
                    }
                    className={cn(
                      'flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold',
                      on
                        ? 'border-forest bg-forest text-white'
                        : 'border-sage bg-surface hover:border-forest',
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4', on ? 'text-minty' : 'text-forest')}
                      aria-hidden="true"
                    />
                    {name}
                  </button>
                );
              })}
            </div>
            {errors.categories && (
              <p role="alert" className="mt-2 text-[13px] font-medium text-pin-700">
                {errors.categories}
              </p>
            )}
          </fieldset>
        </Card>

        <Card className="space-y-6 p-6 sm:p-8">
          <h2 className="text-[20px] font-extrabold text-forest">Visiting information</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Operating hours"
              required
              hint='For example: "Daily, 7 AM to 5 PM".'
              error={errors.operatingHours}
            >
              {(props) => (
                <Input
                  {...props}
                  value={form.operatingHours}
                  onChange={onText('operatingHours')}
                  maxLength={255}
                />
              )}
            </Field>
            <Field label="Entrance fee" optional hint='For example: "Free" or "P30 to P50".'>
              {(props) => (
                <Input
                  {...props}
                  value={form.entranceFee}
                  onChange={onText('entranceFee')}
                  maxLength={100}
                />
              )}
            </Field>
            <Field label="Best time to visit" optional className="sm:col-span-2">
              {(props) => (
                <Input
                  {...props}
                  value={form.bestTimeToVisit}
                  onChange={onText('bestTimeToVisit')}
                  maxLength={255}
                />
              )}
            </Field>
            <Field label="Safety reminders" optional className="sm:col-span-2">
              {(props) => (
                <Textarea
                  {...props}
                  rows={3}
                  value={form.safetyReminders}
                  onChange={onText('safetyReminders')}
                  maxLength={2000}
                />
              )}
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-6 sm:p-8">
          <div>
            <h2 className="text-[20px] font-extrabold text-forest">
              Photos{' '}
              <span className="text-pin" aria-hidden="true">
                *
              </span>
            </h2>
            <p className="mt-1 text-[14px] text-muted">
              1 to 5 photos you took yourself. The main photo is shown first. Photos are checked by
              an administrator before they are public.
            </p>
          </div>
          {savedPhotos.length > 0 && (
            <ul className="flex flex-wrap gap-3" aria-label="Saved photos">
              {savedPhotos.map((p, i) => (
                <li
                  key={p.id}
                  className={cn(
                    'relative h-28 w-36 overflow-hidden rounded-ctl border-2',
                    p.isPrimary ? 'border-forest' : 'border-sage',
                  )}
                >
                  <img
                    src={p.url}
                    alt={`Saved photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => photoAction(p.id, 'DELETE')}
                      className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-card hover:bg-white"
                      aria-label={`Remove saved photo ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={p.isPrimary || locked}
                    onClick={() => photoAction(`${p.id}/primary`, 'POST')}
                    aria-pressed={p.isPrimary}
                    className={cn(
                      'absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow-card',
                      p.isPrimary ? 'bg-forest text-white' : 'bg-white/95 hover:bg-white',
                    )}
                  >
                    <Star className="h-3 w-3" aria-hidden="true" />
                    {p.isPrimary ? 'Main photo' : 'Make main'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!locked && photoRoom > 0 && (
            <PhotoUploader
              value={newPhotos}
              onChange={(next) => {
                setNewPhotos(next);
                setErrors((e) => ({ ...e, photos: undefined }));
              }}
              max={photoRoom}
              invalid={Boolean(errors.photos)}
              hint={savedPhotos.length ? `${savedPhotos.length} saved.` : undefined}
            />
          )}
          {errors.photos && (
            <p role="alert" className="text-[13px] font-medium text-pin-700">
              {errors.photos}
            </p>
          )}
        </Card>
      </fieldset>

      {!locked && (
        <div className="sticky bottom-0 z-10 -mx-5 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-sage bg-cream/95 px-5 py-4 backdrop-blur sm:mx-0 sm:rounded-panel sm:border">
          <div>
            {saved?.status === 'draft' && (
              <Button variant="ghost" onClick={deleteDraft} disabled={Boolean(busy)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete draft
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={saveDraft}
              loading={busy === 'draft'}
              disabled={Boolean(busy)}
            >
              Save draft
            </Button>
            <Button
              onClick={() => submit(false)}
              loading={busy === 'submit'}
              disabled={Boolean(busy)}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {saved?.status === 'returned' ? 'Submit again' : 'Submit nomination'}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="This place may already be listed"
        description="Check these before you submit. If yours is a different place, you can still submit it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Go back and edit
            </Button>
            <Button
              onClick={() => {
                setConfirm(null);
                submit(true);
              }}
            >
              Submit anyway
            </Button>
          </>
        }
      >
        {confirm && <MatchList duplicates={confirm.duplicates} known={confirm.known} />}
      </Modal>
    </div>
  );
}
