import { NavLink, Outlet, useMatches } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

const LINKS = [
  { to: '/contribute/reviews', label: 'My Reviews' },
  { to: '/contribute/nominations', label: 'My Nominations' },
];

// "My Contributions": page title and side menu on the left, the list on the right.
export function ContributionsLayout() {
  const matches = useMatches();
  const title = matches[matches.length - 1]?.handle?.title || 'My Contributions';
  return (
    <div className="mx-auto grid max-w-page gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[260px_1fr]">
      <div className="space-y-5">
        <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
          {title}
        </h1>
        <Card as="nav" aria-label="Contributions" className="overflow-hidden">
          <p className="border-b border-sage/70 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
            Contributions
          </p>
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between border-l-4 px-5 py-3.5 text-[15px]',
                  isActive
                    ? 'border-forest bg-minty-50 font-semibold text-forest'
                    : 'border-transparent text-charcoal hover:bg-cream',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </Card>
      </div>
      <div className="min-w-0 lg:pt-[68px]">
        <Outlet />
      </div>
    </div>
  );
}
