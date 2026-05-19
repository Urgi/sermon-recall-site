/** One-shot toast shown on the next admin page load (survives client navigation). */

const STORAGE_KEY = 'sermon_recall_admin_toast';

export type PendingAdminToast = {
  message: string;
  variant: 'success' | 'error';
  href?: string;
  hrefLabel?: string;
};

export function queueAdminToast(toast: PendingAdminToast): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toast));
}

export function consumePendingAdminToast(): PendingAdminToast | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as PendingAdminToast;
    if (typeof parsed.message !== 'string') return null;
    return {
      message: parsed.message,
      variant: parsed.variant === 'error' ? 'error' : 'success',
      href: typeof parsed.href === 'string' ? parsed.href : undefined,
      hrefLabel: typeof parsed.hrefLabel === 'string' ? parsed.hrefLabel : undefined,
    };
  } catch {
    return null;
  }
}
