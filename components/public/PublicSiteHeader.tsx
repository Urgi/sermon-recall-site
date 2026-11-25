'use client';

import Link from 'next/link';

import { AuthLanguageSwitch } from '@/components/auth/AuthLanguageSwitch';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { useLanguage } from '@/components/i18n/LanguageProvider';

export function PublicSiteHeader() {
  const { t } = useLanguage();
  return (
    <header className="border-b border-[rgba(56,189,248,0.12)] bg-[#05070a]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label={t('jp.homeAria')}>
          <SermonRecallLogo variant="header" className="h-9 w-auto" priority />
        </Link>
        {/* Phones: the switcher sits beside the logo and the links wrap to their own row. */}
        <AuthLanguageSwitch className="sm:order-last" />
        <nav
          className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:gap-4"
          aria-label={t('pub.navMain')}
        >
          <Link
            href="/faq"
            className="inline-flex min-h-10 items-center px-1 text-[14px] font-medium text-[#94a3b8] hover:text-[#e2e8f0]"
          >
            {t('pub.faq')}
          </Link>
          <Link
            href="/support"
            className="inline-flex min-h-10 items-center px-1 text-[14px] font-medium text-[#94a3b8] hover:text-[#e2e8f0]"
          >
            {t('pub.support')}
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[rgba(56,189,248,0.35)] bg-[#0a0f18] px-3 py-2 text-[14px] font-semibold text-[#38bdf8] hover:bg-[#0f172a] sm:px-4"
          >
            {t('jp.pastorSignIn')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
