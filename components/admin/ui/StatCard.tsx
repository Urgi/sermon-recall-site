import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatTrend = {
  /** Signed change vs the previous period; null hides the indicator. */
  delta: number;
  /** Visible suffix, e.g. "vs last week". */
  label: string;
  /** Screen-reader sentence, e.g. "+2 compared with last week". */
  ariaLabel: string;
  /** For metrics where going up is bad (e.g. inactive members). */
  invert?: boolean;
};

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  trend?: StatTrend | null;
  href?: string;
};

export function StatCard({ label, value, hint, icon: Icon, trend, href }: Props) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--admin-muted)]">{label}</p>
        {Icon ? <Icon aria-hidden className="h-4 w-4 text-[var(--admin-dim)]" strokeWidth={1.75} /> : null}
      </div>
      <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-[var(--admin-fg-strong)]">
        {value}
      </p>
      <div className="mt-3 flex min-h-[1.25rem] flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        {trend ? <TrendPill trend={trend} /> : null}
        {hint ? <span className="text-[var(--admin-muted)]">{hint}</span> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="admin-stat-card block">
        {body}
      </Link>
    );
  }
  return <div className="admin-stat-card">{body}</div>;
}

function TrendPill({ trend }: { trend: StatTrend }) {
  const { delta, invert } = trend;
  const good = invert ? delta < 0 : delta > 0;
  const flat = delta === 0;
  const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = flat
    ? 'text-[var(--admin-muted)]'
    : good
      ? 'text-[var(--trend-up)]'
      : 'text-[var(--trend-down)]';
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${color}`} aria-hidden>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {delta > 0 ? `+${delta}` : delta}
      </span>
      <span className="text-[var(--admin-muted)]" aria-hidden>
        {trend.label}
      </span>
      <span className="sr-only">{trend.ariaLabel}</span>
    </span>
  );
}
