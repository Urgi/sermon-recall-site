import Link from 'next/link';

import { useLanguage } from '@/components/i18n/LanguageProvider';

type Props = {
  sermonId: string;
  characterCount: number;
};

export function SermonTranscriptLinkCard({ sermonId, characterCount }: Props) {
  const { t } = useLanguage();
  return (
    <Link
      href={`/sermons/${sermonId}/transcript`}
      className="admin-card block p-5 transition-colors duration-fast hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-nav-hover-bg)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-admin-accent">
            {t('tx.title')}
          </p>
          <p className="admin-body mt-1">
            {t('tx.linkHint')}
          </p>
          <p className="admin-hint mt-2 text-[12px]">
            {t('tx.charsShort', { n: characterCount.toLocaleString() })}
          </p>
        </div>
        <span className="shrink-0 text-[13px] font-medium text-[var(--admin-accent)]">{t('tx.view')}</span>
      </div>
    </Link>
  );
}
