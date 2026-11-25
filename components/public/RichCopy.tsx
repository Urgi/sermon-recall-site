'use client';

import { Fragment, type ReactNode } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import type { UiKey } from '@/lib/i18n/ui';

/**
 * Translated sentence with inline elements (links, emphasis). The copy keeps `{name}`
 * placeholders so each language can put the link where its grammar needs it.
 */
export function RichCopy({ k, parts }: { k: UiKey; parts: Record<string, ReactNode> }) {
  const { t } = useLanguage();
  return (
    <>
      {t(k)
        .split(/(\{\w+\})/)
        .map((segment, i) => {
          const name = segment.match(/^\{(\w+)\}$/)?.[1];
          return name && name in parts ? <Fragment key={i}>{parts[name]}</Fragment> : segment;
        })}
    </>
  );
}
