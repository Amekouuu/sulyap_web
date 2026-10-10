import { CircleCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  ACCOUNT_STATUS,
  ACCOUNT_VERIFICATION,
  MODERATION,
  REPORT,
  WORKFLOW,
} from '@/constants/status';
import { SEASONS } from '@/constants/options';
import { categoryIcon } from '@/constants/categories';

const TONES = {
  positive: 'bg-minty-100 text-forest',
  strong: 'bg-forest text-white',
  pending: 'bg-gold-100 text-gold-700',
  attention: 'bg-terracotta-50 text-terracotta-700',
  negative: 'bg-pin-50 text-pin-700',
  neutral: 'bg-[#ECEFED] text-[#47524C]',
};

// Rounded status label with a small dot (or an icon) in front, as in the mockup.
export function Pill({ tone = 'neutral', icon: Icon, dot = true, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none',
        TONES[tone],
        className,
      )}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        dot && (
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
        )
      )}
      {children}
    </span>
  );
}

// audience: 'submitter' | 'admin' | 'officer'
export function WorkflowPill({ status, audience = 'submitter' }) {
  const s = WORKFLOW[status];
  return s ? <Pill tone={s.tone}>{s[audience]}</Pill> : null;
}

export function ModerationPill({ status }) {
  const s = MODERATION[status];
  return s ? <Pill tone={s.tone}>{s.label}</Pill> : null;
}

export function ReportPill({ status }) {
  const s = REPORT[status];
  return s ? <Pill tone={s.tone}>{s.label}</Pill> : null;
}

export function VerificationPill({ status }) {
  const s = ACCOUNT_VERIFICATION[status];
  return s ? <Pill tone={s.tone}>{s.label}</Pill> : null;
}

export function AccountStatusPill({ status }) {
  const s = ACCOUNT_STATUS[status];
  return s ? <Pill tone={s.tone}>{s.label}</Pill> : null;
}

// The public "Endorsed" badge shown on listings and destination pages.
export function EndorsedBadge({ className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[8px] bg-forest px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white',
        className,
      )}
    >
      <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Endorsed
    </span>
  );
}

export function SeasonPill({ season }) {
  const s = SEASONS.find((item) => item.value === season);
  if (!s) return null;
  return (
    <Pill
      tone={season === 'Summer' ? 'pending' : 'positive'}
      icon={s.icon}
      className="rounded-[6px]"
    >
      {s.label}
    </Pill>
  );
}

export function CategoryTag({ name, withIcon = false }) {
  const Icon = categoryIcon(name);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-minty-50 px-2.5 py-1 text-[12px] font-semibold text-forest">
      {withIcon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {name}
    </span>
  );
}
