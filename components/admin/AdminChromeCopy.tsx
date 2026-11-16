'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { UiKey } from '@/lib/i18n/ui';

/** Translated text for server-rendered admin pages (the language lives in a client provider). */
export function AdminChromeCopy({ k }: { k: UiKey }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
