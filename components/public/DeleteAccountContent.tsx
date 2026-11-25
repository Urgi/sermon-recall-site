'use client';

import Link from 'next/link';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { RichCopy } from '@/components/public/RichCopy';
import { supportEmail } from '@/lib/public-site/config';

export function DeleteAccountContent() {
  const { t } = useLanguage();
  const email = supportEmail();
  const strong = (text: string) => <strong className="text-white">{text}</strong>;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-white">{t('pub.del.title')}</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-[#94a3b8]">{t('pub.del.lead')}</p>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-white">{t('pub.del.appTitle')}</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[#cbd5e1]">
          <li>{t('pub.del.app1')}</li>
          <li>
            <RichCopy k="pub.del.app2" parts={{ settings: strong(t('nav.settings')) }} />
          </li>
          <li>
            <RichCopy k="pub.del.app3" parts={{ delete: strong(t('pub.deleteAccount')) }} />
          </li>
        </ol>
        <p className="text-[15px] leading-relaxed text-[#94a3b8]">{t('pub.del.appNote')}</p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-white">{t('pub.del.portalTitle')}</h2>
        <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[#cbd5e1]">
          <li>
            <RichCopy
              k="pub.del.portal1"
              parts={{
                portal: (
                  <Link href="/login" className="text-[#38bdf8] hover:underline">
                    {t('pub.del.portalLink')}
                  </Link>
                ),
              }}
            />
          </li>
          <li>
            <RichCopy
              k="pub.del.portal2"
              parts={{ settings: strong(t('nav.settings')), delete: strong(t('pub.deleteAccount')) }}
            />
          </li>
        </ol>
        <p className="text-[15px] leading-relaxed text-[#94a3b8]">{t('pub.del.portalNote')}</p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-white">{t('pub.del.emailTitle')}</h2>
        <p className="text-[15px] leading-relaxed text-[#cbd5e1]">
          <RichCopy
            k="pub.del.emailBody"
            parts={{
              email: (
                <a
                  href={`mailto:${email}?subject=Delete%20Sermon%20Recall%20account`}
                  className="font-semibold text-[#38bdf8] hover:underline"
                >
                  {email}
                </a>
              ),
            }}
          />
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-white">{t('pub.del.whatTitle')}</h2>
        <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#cbd5e1]">
          <li>{t('pub.del.what1')}</li>
          <li>{t('pub.del.what2')}</li>
          <li>{t('pub.del.what3')}</li>
        </ul>
        <p className="text-[15px] leading-relaxed text-[#94a3b8]">{t('pub.del.whatNote')}</p>
      </section>

      <p className="mt-10 text-[14px] text-[#94a3b8]">
        <RichCopy
          k="pub.del.seeAlso"
          parts={{
            privacy: (
              <Link href="/privacy" className="text-[#38bdf8] hover:underline">
                {t('pub.privacyLink')}
              </Link>
            ),
            support: (
              <Link href="/support" className="text-[#38bdf8] hover:underline">
                {t('pub.faq.supportPage')}
              </Link>
            ),
          }}
        />
      </p>
    </main>
  );
}
