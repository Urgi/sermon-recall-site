'use client';

import Link from 'next/link';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { MemberAppStoreLinks } from '@/components/public/MemberAppStoreLinks';
import { RichCopy } from '@/components/public/RichCopy';
import { supportEmail } from '@/lib/public-site/config';

export function SupportContent() {
  const { t } = useLanguage();
  const email = supportEmail();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-white">{t('pub.supportContact')}</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-[#94a3b8]">{t('pub.support.lead')}</p>

      <section className="mt-10 rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18] p-6">
        <h2 className="text-lg font-semibold text-white">{t('pub.support.emailTitle')}</h2>
        <p className="mt-2 text-[15px] text-[#94a3b8]">{t('pub.support.emailBody')}</p>
        <a
          href={`mailto:${email}`}
          className="mt-4 inline-block text-[17px] font-semibold text-[#38bdf8] hover:underline"
        >
          {email}
        </a>
        <p className="mt-4 text-[14px] text-[#94a3b8]">{t('pub.support.response')}</p>
      </section>

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">{t('pub.support.pastorsTitle')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
            <RichCopy
              k="pub.support.pastorsBody"
              parts={{
                register: (
                  <Link href="/register" className="text-[#38bdf8] hover:underline">
                    {t('pub.support.registerLink')}
                  </Link>
                ),
              }}
            />
          </p>
          <Link
            href="/login"
            className="mt-2 inline-flex min-h-10 items-center text-[14px] font-semibold text-[#38bdf8] hover:underline"
          >
            {t('pub.support.pastorLink')}
          </Link>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">{t('pub.support.membersTitle')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">{t('pub.support.membersBody')}</p>
          <MemberAppStoreLinks className="mt-4" size="compact" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">{t('pub.faq')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
            <RichCopy
              k="pub.support.faqBody"
              parts={{
                faq: (
                  <Link href="/faq" className="text-[#38bdf8] hover:underline">
                    {t('pub.faq')}
                  </Link>
                ),
              }}
            />
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white">{t('pub.support.privacyTitle')}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
            <RichCopy
              k="pub.support.privacyBody"
              parts={{
                privacy: (
                  <Link href="/privacy" className="text-[#38bdf8] hover:underline">
                    {t('pub.privacyLink')}
                  </Link>
                ),
              }}
            />
          </p>
        </div>
      </section>
    </main>
  );
}
