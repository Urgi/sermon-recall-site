'use client';

import Link from 'next/link';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { FaqAccordion } from '@/components/public/FaqAccordion';
import { RichCopy } from '@/components/public/RichCopy';

export function HomeFaqSection() {
  const { t } = useLanguage();
  return (
    <section
      id="faq"
      className="border-t border-[rgba(56,189,248,0.1)] bg-[#0a0f18]/40 px-4 py-14 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t('pub.homeFaq.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-[#94a3b8]">
            {t('pub.homeFaq.lead')}
          </p>
        </div>

        <div className="mt-10">
          <FaqAccordion defaultOpenFirst />
        </div>

        <p className="mt-8 text-center text-[14px] text-[#94a3b8]">
          <RichCopy
            k="pub.homeFaq.more"
            parts={{
              all: (
                <Link href="/faq" className="font-medium text-[#38bdf8] hover:underline">
                  {t('pub.homeFaq.viewAll')}
                </Link>
              ),
              contact: (
                <Link href="/support" className="font-medium text-[#38bdf8] hover:underline">
                  {t('pub.homeFaq.contact')}
                </Link>
              ),
            }}
          />
        </p>
      </div>
    </section>
  );
}
