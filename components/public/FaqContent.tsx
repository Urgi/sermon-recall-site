'use client';

import Link from 'next/link';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { FaqAccordion } from '@/components/public/FaqAccordion';
import { RichCopy } from '@/components/public/RichCopy';
import { supportEmail } from '@/lib/public-site/config';

export function FaqContent() {
  const { t } = useLanguage();
  const email = supportEmail();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-white">{t('pub.faq.title')}</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-[#94a3b8]">{t('pub.faq.lead')}</p>

      <div className="mt-10">
        <FaqAccordion />
      </div>

      <section className="mt-10 rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#05070a] p-6">
        <h2 className="text-lg font-semibold text-white">{t('pub.faq.stillTitle')}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
          <RichCopy
            k="pub.faq.stillBody"
            parts={{
              email: (
                <a href={`mailto:${email}`} className="font-semibold text-[#38bdf8] hover:underline">
                  {email}
                </a>
              ),
              support: (
                <Link href="/support" className="text-[#38bdf8] hover:underline">
                  {t('pub.faq.supportPage')}
                </Link>
              ),
              login: (
                <Link href="/login" className="text-[#38bdf8] hover:underline">
                  {t('pub.faq.loginLink')}
                </Link>
              ),
            }}
          />
        </p>
      </section>
    </main>
  );
}
