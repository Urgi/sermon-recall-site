/** One-shot toast shown on the next page load (auth + admin). */

const STORAGE_KEY = 'sermon_recall_app_toast';

export type PendingAppToast = {
  message: string;
  variant: 'success' | 'error';
  href?: string;
  hrefLabel?: string;
};

export function queueAppToast(toast: PendingAppToast): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toast));
}

export function consumePendingAppToast(): PendingAppToast | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as PendingAppToast;
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
