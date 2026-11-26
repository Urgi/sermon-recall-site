'use client';

import { History } from 'lucide-react';
import { useState } from 'react';

import { PastorBroadcastHistory } from '@/components/admin/PastorBroadcastHistory';
import { AccordionRow } from '@/components/admin/ui/AccordionRow';
import { useLanguage } from '@/components/i18n/LanguageProvider';

/** Broadcast history folded into a collapsible row; the summary shows how many have been sent. */
export function BroadcastHistoryAccordion() {
  const { t } = useLanguage();
  const [count, setCount] = useState<number | null>(null);
  return (
    <AccordionRow
      title={t('notify.history')}
      icon={History}
      summary={count === null ? t('notify.summaryLoading') : t('notify.summaryHistory', { n: count })}
    >
      <div className="p-5">
        <p className="admin-hint">{t('notify.historyHint')}</p>
        <div className="mt-4">
          <PastorBroadcastHistory onCountChange={setCount} />
        </div>
      </div>
    </AccordionRow>
  );
}
