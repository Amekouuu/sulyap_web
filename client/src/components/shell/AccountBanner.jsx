import { Link } from 'react-router-dom';
import { CircleAlert, Info } from 'lucide-react';
import { useSession } from '@/session/SessionContext';
import { cn } from '@/lib/cn';

// Reminds a Registered User what is left before they can post.
const STEPS = {
  email_unverified: {
    text: 'Confirm your e-mail address to finish signing up.',
    to: '/check-email',
    action: 'Get a new link',
  },
  no_id: {
    text: 'Upload a valid ID so you can post reviews, photos, and nominations.',
    to: '/upload-id',
    action: 'Upload your ID',
  },
  pending: { text: 'Your ID is being reviewed. You can keep browsing in the meantime.' },
  rejected: {
    text: 'Your ID was not accepted.',
    to: '/upload-id',
    action: 'See why and upload again',
    warn: true,
  },
};

export function AccountBanner() {
  const { user } = useSession();
  const step = user?.role === 'registered_user' ? STEPS[user.verification] : null;
  if (!step) return null;
  const Icon = step.warn ? CircleAlert : Info;
  return (
    <div
      role="status"
      className={cn(
        'border-b',
        step.warn ? 'border-terracotta/30 bg-terracotta-50' : 'border-gold/40 bg-gold-100',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-page flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-[14px] sm:px-8',
          step.warn ? 'text-terracotta-700' : 'text-gold-700',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{step.text}</span>
        {step.to && (
          <Link to={step.to} className="font-semibold underline underline-offset-2">
            {step.action}
          </Link>
        )}
      </div>
    </div>
  );
}
