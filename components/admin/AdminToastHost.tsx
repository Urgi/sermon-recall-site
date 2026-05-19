'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { consumePendingAdminToast, type PendingAdminToast } from '@/lib/admin/toast';

type VisibleToast = PendingAdminToast & { id: number };

const AUTO_DISMISS_MS = 8000;

export function AdminToastHost() {
  const [toasts, setToasts] = useState<VisibleToast[]>([]);

  useEffect(() => {
    const pending = consumePendingAdminToast();
    if (pending) {
      setToasts((t) => [...t, { ...pending, id: Date.now() }]);
    }
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const id = window.setTimeout(() => {
      setToasts((t) => t.slice(1));
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 wide:top-6"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex max-w-md flex-col gap-2 rounded-xl border px-4 py-3 shadow-lg motion-safe:animate-hintFade ${
            toast.variant === 'error'
              ? 'border-red-500/40 bg-[#1a0a0a] text-red-100'
              : 'border-emerald-500/40 bg-[#061210] text-emerald-50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[14px] leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToasts((t) => t.filter((x) => x.id !== toast.id))}
              className="shrink-0 text-[18px] leading-none opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          {toast.href ? (
            <Link
              href={toast.href}
              className="text-[13px] font-medium text-sky-300 hover:text-sky-200 hover:underline"
            >
              {toast.hrefLabel ?? 'View'}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
