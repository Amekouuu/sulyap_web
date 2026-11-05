import { useState } from 'react';
import { Info, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { PhotoUploader } from '@/components/ui/PhotoUploader';
import { PHOTO_RULES } from '@/constants/options';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

// Write a review: 1 to 5 stars, optional text, and up to 3 photos. Reviews wait for an
// administrator before they appear on the page.
export function ReviewModal({ open, onClose, destination, onDone }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function close() {
    if (busy) return;
    setError('');
    onClose();
  }

  async function submit() {
    if (!rating) {
      setError('Choose a rating from 1 to 5 stars.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('rating', String(rating));
      if (text.trim()) body.append('text', text.trim());
      photos.forEach((p) => body.append('photos', p.file));
      await api(`/destinations/${destination.id}/reviews`, { method: 'POST', body });
      setRating(0);
      setText('');
      setPhotos([]);
      onDone();
    } catch (err) {
      setError(
        err.code === 'prohibited_terms'
          ? `Please remove these words: ${err.details?.terms?.join(', ')}.`
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Write a review"
      description={`${destination.name} · ${destination.jurisdiction}, Pampanga`}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Submit review
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="text-[14px] font-semibold">
            Your rating{' '}
            <span className="text-pin" aria-hidden="true">
              *
            </span>
          </legend>
          <div className="mt-2 flex items-center gap-3">
            <div role="radiogroup" aria-label="Rating" className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? 's' : ''}, ${LABELS[n]}`}
                  onClick={() => setRating(n)}
                  className="rounded-[6px] p-1 text-gold hover:scale-110"
                >
                  <Star
                    className={cn('h-8 w-8', n <= rating ? 'fill-current' : 'text-sage')}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <span className="text-[14px] text-muted" aria-live="polite">
              {rating ? LABELS[rating] : 'Select a rating'}
            </span>
          </div>
        </fieldset>
        <Field label="Your review" optional>
          {(props) => (
            <Textarea
              {...props}
              rows={5}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={2000}
              placeholder="What should the next visitor know?"
            />
          )}
        </Field>
        <div className="space-y-2">
          <p className="text-[14px] font-semibold">
            Photos <span className="font-normal text-muted">(optional)</span>
          </p>
          <PhotoUploader value={photos} onChange={setPhotos} max={PHOTO_RULES.review.max} />
        </div>
        <p className="flex items-start gap-3 rounded-ctl border border-minty-100 bg-minty-50 p-4 text-[13px] leading-relaxed">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
          Reviews and photos are checked by an administrator for spam, wrong information, and
          content unrelated to Pampanga. You can follow the status in My Reviews.
        </p>
        {error && (
          <p role="alert" className="text-[14px] font-medium text-pin-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
