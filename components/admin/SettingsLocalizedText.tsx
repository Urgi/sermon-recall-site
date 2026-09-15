'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { UiKey } from '@/lib/i18n/ui';

export function SettingsLocalizedText({
  k,
  as: Tag = 'span',
}: {
  k: UiKey;
  as?: 'p' | 'h1' | 'h2' | 'span';
}) {
  const { t } = useLanguage();
  return <Tag>{t(k)}</Tag>;
}
