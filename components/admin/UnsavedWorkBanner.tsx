import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/** Inline reminder while sermon / devotional work is not saved. */
export function UnsavedWorkBanner({ children }: Props) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-[13px] leading-relaxed text-amber-100/95"
    >
      {children}
    </div>
  );
}
