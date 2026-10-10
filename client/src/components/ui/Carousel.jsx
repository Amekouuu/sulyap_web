import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { cn } from '@/lib/cn';

// Photo carousel: arrow buttons, thumbnails, left/right keys, and swipe on touch screens.
// images: [{ src, alt, caption }]
export function Carousel({ images, className, aspect = 'aspect-[16/10]' }) {
  const [index, setIndex] = useState(0);
  const startX = useRef(null);
  const count = images.length;

  if (!count) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-panel border border-sage bg-surface text-muted',
          aspect,
          className,
        )}
      >
        <ImageOff className="h-7 w-7" aria-hidden="true" />
        <p className="text-[14px]">No photos yet</p>
      </div>
    );
  }

  // The list can shrink (for example after a photo is removed), so keep the index in range.
  const shown = Math.min(index, count - 1);
  const go = (next) => setIndex((next + count) % count);
  const current = images[shown];

  function onKeyDown(event) {
    if (event.key === 'ArrowLeft') go(shown - 1);
    if (event.key === 'ArrowRight') go(shown + 1);
  }
  function onPointerUp(event) {
    if (startX.current === null) return;
    const moved = event.clientX - startX.current;
    if (Math.abs(moved) > 40) go(moved < 0 ? shown + 1 : shown - 1);
    startX.current = null;
  }

  return (
    // min-w-0 lets the carousel shrink inside flex and grid layouts; the thumbnail strip scrolls instead.
    <div className={cn('min-w-0 space-y-3', className)}>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Photos"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={onPointerUp}
        className={cn(
          'relative touch-pan-y select-none overflow-hidden rounded-panel bg-sage/40',
          aspect,
        )}
      >
        <img
          src={current.src}
          alt={current.alt}
          className="h-full w-full object-cover"
          draggable="false"
        />
        {current.caption && (
          <p className="absolute bottom-3 left-3 max-w-[80%] rounded-[8px] bg-charcoal/70 px-3 py-1.5 text-[13px] text-white">
            {current.caption}
          </p>
        )}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(shown - 1)}
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-card hover:bg-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(shown + 1)}
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-card hover:bg-white"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="num absolute right-3 top-3 rounded-full bg-charcoal/70 px-2.5 py-1 text-[12px] font-semibold text-white">
              {shown + 1} / {count}
            </span>
          </>
        )}
        <p className="sr-only" aria-live="polite">
          Photo {shown + 1} of {count}
          {current.caption ? `: ${current.caption}` : ''}
        </p>
      </div>
      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <button
              key={image.src + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === shown ? 'true' : undefined}
              className={cn(
                'h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border-2 transition',
                i === shown ? 'border-forest' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <img src={image.src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
