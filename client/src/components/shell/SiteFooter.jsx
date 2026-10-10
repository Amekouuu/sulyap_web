import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DISCLAIMER_ENDORSED } from '@/constants/options';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { to: '/', label: 'Home' },
      { to: '/destinations', label: 'Destinations' },
      { to: '/map', label: 'Interactive Map' },
    ],
  },
  {
    title: 'Contribute',
    links: [
      { to: '/nominate', label: 'Nominate a destination' },
      { to: '/contribute/reviews', label: 'My reviews' },
      { to: '/contribute/nominations', label: 'My nominations' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/signup', label: 'Create an account' },
      { to: '/login', label: 'Log in' },
      { to: '/account', label: 'Account settings' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-forest text-white">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-md">
          <Logo light />
          <p className="mt-5 text-[16px] leading-relaxed text-white/90">
            A provincial tourism office-supported platform for discovering lesser-known tourist
            destinations across Pampanga.
          </p>
          <p className="mt-4 text-[13px] leading-relaxed text-white/70">{DISCLAIMER_ENDORSED}</p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-[12px] font-bold uppercase tracking-[0.08em] text-minty">
              {column.title}
            </h2>
            <ul className="mt-4 space-y-3 text-[15px]">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-white/90 hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-page flex-col gap-2 px-5 py-5 text-[13px] text-white/75 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>&copy; 2026 Sulyap &middot; Holy Angel University, School of Computing</p>
          <p className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-pin-hi" aria-hidden="true" />
            Province of Pampanga, Philippines
          </p>
        </div>
      </div>
    </footer>
  );
}
