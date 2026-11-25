'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { UiKey, UiVars } from '@/lib/i18n/ui';

/** Translated text for server-rendered pages (the language lives in a client provider). */
export function AdminChromeCopy({ k, vars }: { k: UiKey; vars?: UiVars }) {
  const { t } = useLanguage();
  return <>{t(k, vars)}</>;
}
