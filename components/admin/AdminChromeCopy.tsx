'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

export function AdminChromeCopy({ k }: { k: 'nav.churchAdmin' }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
