'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';

export function AdminPageFallback() {
  const { t } = useLanguage();
  return (
    <div
      className="mx-auto max-w-6xl space-y-6 motion-safe:animate-pulse"
      role="status"
      aria-busy="true"
      aria-label={t('common.loading')}
    >
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-[var(--admin-border)]" />
        <div className="h-4 w-72 max-w-full rounded-md bg-[var(--admin-border)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="admin-stat-card h-24" />
        ))}
      </div>
      <div className="admin-card h-52" />
    </div>
  );
}
