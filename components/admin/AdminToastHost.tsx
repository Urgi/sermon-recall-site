'use client';

import { ToastCard } from '@/components/ToastCard';
import { useEffect, useState } from 'react';

import { consumePendingAdminToast, type PendingAdminToast } from '@/lib/admin/toast';

type VisibleToast = PendingAdminToast & { id: number };

const AUTO_DISMISS_MS = 9000;

export function AdminToastHost() {
  const [toasts, setToasts] = useState<VisibleToast[]>([]);

  useEffect(() => {
    const pending = consumePendingAdminToast();
    if (pending) {
      setToasts((t) => [...t, { ...pending, id: Date.now() }]);
    }
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="app-toast-stack pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          href={toast.href}
          hrefLabel={toast.hrefLabel}
          autoDismissMs={toast.variant === 'error' || toast.href ? AUTO_DISMISS_MS : 6000}
          onDismiss={() => setToasts((t) => t.filter((x) => x.id !== toast.id))}
        />
      ))}
    </div>
  );
}
