'use client';

import Link from 'next/link';

import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { HomeFaqSection } from '@/components/public/HomeFaqSection';
import { MemberAppStoreLinks } from '@/components/public/MemberAppStoreLinks';
import type { UiKey } from '@/lib/i18n/ui';
import { supportEmail } from '@/lib/public-site/config';

const STEPS: { step: string; title: UiKey; body: UiKey }[] = [
  { step: '1', title: 'pub.home.step1Title', body: 'pub.home.step1Body' },
  { step: '2', title: 'pub.home.step2Title', body: 'pub.home.step2Body' },
  { step: '3', title: 'pub.home.step3Title', body: 'pub.home.step3Body' },
];

export function HomeContent() {
  const { t } = useLanguage();
  const email = supportEmail();

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <SermonRecallLogo variant="hero" className="mx-auto h-28 w-auto" priority />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t('pub.home.title')}
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-[#94a3b8]">{t('pub.home.lead')}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-lg bg-[#0379bd] px-6 py-3 text-center text-[15px] font-semibold text-white hover:bg-[#0369a1] sm:w-auto"
            >
              {t('jp.pastorSignIn')}
            </Link>
            <Link
              href="/register"
              className="w-full rounded-lg border border-[rgba(56,189,248,0.35)] bg-[#0a0f18] px-6 py-3 text-center text-[15px] font-semibold text-[#38bdf8] hover:bg-[#0f172a] sm:w-auto"
            >
              {t('pub.home.createChurch')}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-[rgba(56,189,248,0.1)] bg-[#0a0f18]/50 px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <article className="rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#05070a] p-6">
            <h2 className="text-lg font-semibold text-white">{t('pub.home.pastorsTitle')}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">{t('pub.home.pastorsBody')}</p>
            <ul className="mt-4 space-y-2 text-[14px] text-[#cbd5e1]">
              <li>• {t('pub.home.pastors1')}</li>
              <li>• {t('pub.home.pastors2')}</li>
              <li>• {t('pub.home.pastors3')}</li>
            </ul>
            <Link href="/login" className="mt-3 inline-flex min-h-10 items-center text-[14px] font-semibold text-[#38bdf8] hover:underline">
              {t('pub.home.pastorsLink')}
            </Link>
          </article>

          <article className="rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#05070a] p-6">
            <h2 className="text-lg font-semibold text-white">{t('pub.home.membersTitle')}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">{t('pub.home.membersBody')}</p>
            <ul className="mt-4 space-y-2 text-[14px] text-[#cbd5e1]">
              <li>• {t('pub.home.members1')}</li>
              <li>• {t('pub.home.members2')}</li>
              <li>• {t('pub.home.members3')}</li>
            </ul>
            <MemberAppStoreLinks className="mt-5" />
            <p className="mt-4 text-[14px] text-[#94a3b8]">{t('pub.home.askPastor')}</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-xl font-semibold text-white">{t('pub.home.howTitle')}</h2>
        <ol className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-3">
          {STEPS.map((item) => (
            <li key={item.step} className="text-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0ea5e9]/15 text-[15px] font-bold text-[#38bdf8]">
                {item.step}
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-white">{t(item.title)}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">{t(item.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <HomeFaqSection />

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-lg font-semibold text-white">{t('pub.home.contactTitle')}</h2>
          <p className="mt-2 text-[15px] text-[#94a3b8]">{t('pub.home.contactBody')}</p>
          <p className="mt-4">
            <a href={`mailto:${email}`} className="text-[15px] font-semibold text-[#38bdf8] hover:underline">
              {email}
            </a>
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[14px]">
            <Link href="/faq" className="inline-flex min-h-10 items-center text-[#94a3b8] hover:text-[#e2e8f0]">
              {t('pub.home.readFaq')}
            </Link>
            <Link href="/support" className="inline-flex min-h-10 items-center text-[#94a3b8] hover:text-[#e2e8f0]">
              {t('pub.home.visitSupport')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
