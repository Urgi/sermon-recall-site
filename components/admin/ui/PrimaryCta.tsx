import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  href: string;
  label: ReactNode;
  /** Shown on hover/focus: what clicking achieves, from real data (e.g. "Reach 120 members"). */
  outcome?: ReactNode;
  icon: LucideIcon;
  /** Looping icon motion; disabled under prefers-reduced-motion. */
  motion?: 'ring' | 'lift';
  className?: string;
  onClick?: () => void;
};

export function PrimaryCta({ href, label, outcome, icon: Icon, motion = 'lift', className = '', onClick }: Props) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`admin-btn-primary admin-cta inline-flex min-h-10 items-center justify-center gap-2 ${className}`}
    >
      <Icon aria-hidden className={`h-4 w-4 shrink-0 admin-cta-icon--${motion}`} strokeWidth={2} />
      {outcome ? (
        <span className="admin-cta-labels">
          <span className="admin-cta-idle">{label}</span>
          {/* Decorative preview of the outcome; the accessible name stays the action label. */}
          <span className="admin-cta-outcome whitespace-nowrap" aria-hidden>
            {outcome}
          </span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </Link>
  );
}
