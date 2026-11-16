'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastCardProps = {
  message: string;
  variant: 'success' | 'error';
  href?: string;
  hrefLabel?: string;
  autoDismissMs?: number;
  /** Called after the exit animation finishes. */
  onDismiss: () => void;
};

const EXIT_MS = 120;

/** Single toast with its own auto-dismiss timer and an exit animation. */
export function ToastCard({
  message,
  variant,
  href,
  hrefLabel,
  autoDismissMs = 6000,
  onDismiss,
}: ToastCardProps) {
  const [leaving, setLeaving] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const dismiss = useCallback(() => setLeaving(true), []);

  useEffect(() => {
    const id = window.setTimeout(dismiss, autoDismissMs);
    return () => window.clearTimeout(id);
  }, [autoDismissMs, dismiss]);

  useEffect(() => {
    if (!leaving) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => onDismissRef.current(), reduce ? 0 : EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  const isError = variant === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`${leaving ? 'app-toast-leave' : 'app-toast-enter'} pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
        isError
          ? 'border-red-500/40 bg-red-950 text-red-50'
          : 'border-emerald-500/40 bg-emerald-950 text-emerald-50'
      }`}
    >
      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="none" aria-hidden>
        {isError ? (
          <path d="M10 6v5m0 3h.01M10 2.5 18 16.5H2L10 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug">{message}</p>
        {href ? (
          <Link
            href={href}
            className="mt-1.5 inline-block text-[13px] font-medium text-sky-300 hover:text-sky-200 hover:underline"
          >
            {hrefLabel ?? 'View'}
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="-m-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[18px] leading-none opacity-60 transition-opacity duration-fast hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
