import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

// The Sulyap tile: folded map with a pin. Redrawn as SVG from the brand PNG.
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sulyap-tile" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#234638" />
          <stop offset="1" stopColor="#76D6A6" />
        </linearGradient>
        <linearGradient id="sulyap-paper" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ECCB8F" />
          <stop offset="1" stopColor="#F8F5EF" />
        </linearGradient>
        <linearGradient id="sulyap-pin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF0000" />
          <stop offset="1" stopColor="#CC0000" />
        </linearGradient>
        <clipPath id="sulyap-tile-shape">
          <rect width="160" height="160" rx="22" />
        </clipPath>
      </defs>
      <g clipPath="url(#sulyap-tile-shape)">
        <rect width="160" height="160" fill="url(#sulyap-tile)" />
        <g fill="url(#sulyap-paper)">
          <path d="M11 46H118L93 76H0V59Z" />
          <path d="M0 86H93L118 117H11L0 104Z" />
          <path d="M11 127H118L93 160H0V136Z" />
        </g>
        <path d="M37 160L70 149L86 160Z" fill="#7A6A52" fillOpacity="0.3" />
        <path
          d="M70 150C64 136 53 125 53 108a17 17 0 0 1 34 0c0 17-11 28-17 42Z"
          fill="url(#sulyap-pin)"
        />
        <circle cx="70" cy="107" r="7.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

// Tile + wordmark. light = white wordmark for dark backgrounds (footer, auth photo).
export function Logo({ to = '/', light = false, size = 'md', className }) {
  const big = size === 'lg';
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2.5', className)}
      aria-label="Sulyap home"
    >
      <LogoMark className={big ? 'h-11 w-11' : 'h-9 w-9'} />
      <span
        className={cn(
          'font-extrabold tracking-[-0.03em]',
          big ? 'text-[30px]' : 'text-[26px]',
          light ? 'text-white' : 'wordmark',
        )}
      >
        Sulyap
      </span>
    </Link>
  );
}
