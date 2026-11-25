'use client';

import Link from 'next/link';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { MemberAppStoreLinks } from '@/components/public/MemberAppStoreLinks';
import { PUBLIC_SITE, supportEmail } from '@/lib/public-site/config';

export function PublicSiteFooter() {
  const { t } = useLanguage();
  const email = supportEmail();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(56,189,248,0.12)] bg-[#020408] px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-white">{PUBLIC_SITE.productName}</p>
          <p className="mt-1 text-[13px] text-[#94a3b8]">{t('pub.tagline')}</p>
          <p className="mt-3 text-[13px] text-[#94a3b8]">
            {t('pub.rights', { year, name: PUBLIC_SITE.legalName })}
          </p>
          <MemberAppStoreLinks className="mt-4" size="compact" />
        </div>
        <nav className="flex flex-col text-[14px]" aria-label={t('pub.navFooter')}>
          <Link href="/faq" className="inline-flex min-h-8 items-center text-[#94a3b8] hover:text-[#38bdf8]">
            {t('pub.faq')}
          </Link>
          <Link href="/privacy" className="inline-flex min-h-8 items-center text-[#94a3b8] hover:text-[#38bdf8]">
            {t('pub.privacyPolicy')}
          </Link>
          <Link href="/support" className="inline-flex min-h-8 items-center text-[#94a3b8] hover:text-[#38bdf8]">
            {t('pub.supportContact')}
          </Link>
          <Link href="/delete-account" className="inline-flex min-h-8 items-center text-[#94a3b8] hover:text-[#38bdf8]">
            {t('pub.deleteAccount')}
          </Link>
          <Link href="/login" className="inline-flex min-h-8 items-center text-[#94a3b8] hover:text-[#38bdf8]">
            {t('jp.pastorSignIn')}
          </Link>
          <a href={`mailto:${email}`} className="inline-flex min-h-8 items-center text-[#94a3b8] hover:text-[#38bdf8]">
            {email}
          </a>
        </nav>
      </div>
    </footer>
  );
}
