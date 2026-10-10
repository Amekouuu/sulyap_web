import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes without specificity collisions. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a peso amount, or the word "Free" when there is no entrance fee. */
export function formatFee(pesos: number | null): string {
  if (pesos === null || pesos === 0) return 'Free'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  }).format(pesos)
}

/** "12 Sep 2026" - stable, unambiguous, avoids US/PH date-order confusion. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
