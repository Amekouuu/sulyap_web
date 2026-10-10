import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Star, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PHOTO_RULES } from '@/constants/options';

const MB = 1024 * 1024;
let nextId = 1;

function problemWith(file) {
  const name = file.name.toLowerCase();
  const okType = PHOTO_RULES.types.includes(file.type);
  const okExtension = PHOTO_RULES.extensions.some((ext) => name.endsWith(ext));
  if (!okType || !okExtension) return `${file.name} is not a JPG or PNG photo.`;
  if (file.size > PHOTO_RULES.maxBytes) {
    return `${file.name} is ${(file.size / MB).toFixed(1)} MB. Photos can be up to 5 MB.`;
  }
  return null;
}

// Pick JPG/PNG photos (max 5 MB each), preview them, remove them, and optionally mark one as primary.
// value: [{ id, file, url }]. The server checks every rule again; this is only for quick feedback.
export function PhotoUploader({
  value,
  onChange,
  max = 5,
  label = 'Add photos',
  hint,
  primaryId,
  onPrimaryChange,
  invalid = false,
  describedBy,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [errors, setErrors] = useState([]);

  // Free the preview URLs when the component goes away.
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => () => latest.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);

  function addFiles(fileList) {
    const files = [...fileList];
    const problems = [];
    const accepted = [];
    for (const file of files) {
      const problem = problemWith(file);
      if (problem) problems.push(problem);
      else if (value.length + accepted.length >= max) {
        problems.push(`You can add up to ${max} photo${max === 1 ? '' : 's'}.`);
        break;
      } else accepted.push({ id: `photo-${nextId++}`, file, url: URL.createObjectURL(file) });
    }
    setErrors(problems);
    if (accepted.length) {
      const next = [...value, ...accepted];
      onChange(next);
      if (onPrimaryChange && !primaryId) onPrimaryChange(next[0].id);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(photo) {
    URL.revokeObjectURL(photo.url);
    const next = value.filter((p) => p.id !== photo.id);
    onChange(next);
    if (onPrimaryChange && primaryId === photo.id) onPrimaryChange(next[0]?.id || null);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((photo, i) => {
          const isPrimary = onPrimaryChange && primaryId === photo.id;
          return (
            <div
              key={photo.id}
              className={cn(
                'relative h-28 w-36 overflow-hidden rounded-ctl border-2',
                isPrimary ? 'border-forest' : 'border-sage',
              )}
            >
              <img
                src={photo.url}
                alt={`Selected photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(photo)}
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-charcoal shadow-card hover:bg-white"
                aria-label={`Remove photo ${i + 1}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              {onPrimaryChange && (
                <button
                  type="button"
                  onClick={() => onPrimaryChange(photo.id)}
                  aria-pressed={isPrimary}
                  className={cn(
                    'absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold shadow-card',
                    isPrimary ? 'bg-forest text-white' : 'bg-white/95 text-charcoal hover:bg-white',
                  )}
                >
                  <Star className="h-3 w-3" aria-hidden="true" />
                  {isPrimary ? 'Main photo' : 'Make main'}
                </button>
              )}
            </div>
          );
        })}
        {value.length < max && (
          <label
            htmlFor={inputId}
            className={cn(
              'flex h-28 w-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-ctl border-2 border-dashed bg-surface text-[13px] font-medium text-forest hover:bg-minty-50',
              'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-forest',
              invalid ? 'border-pin' : 'border-sage',
            )}
          >
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
            {label}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              multiple={max > 1}
              className="sr-only"
              aria-describedby={describedBy}
              onChange={(event) => addFiles(event.target.files)}
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-[13px] text-muted">
        {hint ? `${hint} ` : ''}JPG or PNG, up to 5 MB each. {value.length} of {max} added.
      </p>
      {errors.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 text-[13px] font-medium text-pin-700">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
