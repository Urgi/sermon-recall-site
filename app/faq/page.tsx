import type { Metadata } from 'next';
import Link from 'next/link';

import { FaqAccordion } from '@/components/public/FaqAccordion';
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { PUBLIC_FAQ, PUBLIC_SITE, supportEmail } from '@/lib/public-site/config';

export const metadata: Metadata = {
  title: 'FAQ',
  description: `Frequently asked questions about ${PUBLIC_SITE.productName} for churches and members.`,
};

export default function FaqPage() {
  const email = supportEmail();

  return (
    <div className="flex min-h-screen flex-col bg-[#05070a] text-[#e2e8f0]">
      <PublicSiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-white">Frequently asked questions</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-[#94a3b8]">
          Common questions about {PUBLIC_SITE.productName} for pastors, church staff, and members.
        </p>

        <div className="mt-10">
          <FaqAccordion items={PUBLIC_FAQ} />
        </div>

        <section className="mt-10 rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#05070a] p-6">
          <h2 className="text-lg font-semibold text-white">Still have questions?</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
            Reach us at{' '}
            <a href={`mailto:${email}`} className="font-semibold text-[#38bdf8] hover:underline">
              {email}
            </a>{' '}
            or visit our{' '}
            <Link href="/support" className="text-[#38bdf8] hover:underline">
              support page
            </Link>
            . Pastors can{' '}
            <Link href="/login" className="text-[#38bdf8] hover:underline">
              sign in to the admin portal
            </Link>
            .
          </p>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
