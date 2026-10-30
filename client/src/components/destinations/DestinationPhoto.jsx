import { useState } from 'react';
import { CATEGORIES } from '@/constants/categories';
import { cn } from '@/lib/cn';

// A destination's cover photo. Without one (or if it fails to load), a tile in the color of
// its first category is shown instead, as in the mockup.
export function DestinationPhoto({ destination, src, className }) {
  const [failed, setFailed] = useState(false);
  const url = src ?? destination.photo;

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={destination.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('bg-sage/40 object-cover', className)}
      />
    );
  }

  const category = CATEGORIES.find((c) => c.name === destination.categories?.[0]) || CATEGORIES[0];
  const Icon = category.icon;
  return (
    <div
      role="img"
      aria-label={destination.name}
      className={cn('flex items-center justify-center', className)}
      style={{ background: `linear-gradient(150deg, ${category.color}33, ${category.color}88)` }}
    >
      <Icon className="h-10 w-10 text-forest/70" aria-hidden="true" />
    </div>
  );
}
