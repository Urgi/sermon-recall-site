'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { UiKey } from '@/lib/i18n/ui';

/** Formats an ISO date/time in the user's UI language (server pages can't know it). */
export function LocalizedDate({
  iso,
  options = { dateStyle: 'medium' },
  fallback = '—',
}: {
  iso: string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
}) {
  const { language } = useLanguage();
  if (!iso) return <>{fallback}</>;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <>{fallback}</>;
  return <>{new Intl.DateTimeFormat(language, options).format(date)}</>;
}

/** A translated sentence with a `{date}` placeholder filled with a localized date. */
export function DateInText({
  k,
  iso,
  options = { dateStyle: 'long' },
}: {
  k: UiKey;
  iso: string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
}) {
  const { language, t } = useLanguage();
  const date = iso ? new Date(iso) : null;
  const formatted =
    date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(language, options).format(date) : '—';
  return <>{t(k, { date: formatted })}</>;
}
