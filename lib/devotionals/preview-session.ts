import type { DevotionalDay } from '@/lib/devotionals/devotional-days';

const key = (sermonId: string) => `sermon-recall-devotional-preview:${sermonId}`;

export function savePreviewDays(sermonId: string, days: DevotionalDay[]): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(key(sermonId), JSON.stringify(days));
}

export function loadPreviewDays(sermonId: string): DevotionalDay[] | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(key(sermonId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 6) return null;
    return parsed as DevotionalDay[];
  } catch {
    return null;
  }
}

export function clearPreviewDays(sermonId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(key(sermonId));
}
