import Link from 'next/link';

import { FaqAccordion } from '@/components/public/FaqAccordion';
import { PUBLIC_FAQ } from '@/lib/public-site/config';

export function HomeFaqSection() {
  return (
    <section
      id="faq"
      className="border-t border-[rgba(56,189,248,0.1)] bg-[#0a0f18]/40 px-4 py-14 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#38bdf8]">
            Common questions
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Built for pastors, elders, and ministry leaders
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-[#94a3b8]">
            Straight answers to the questions church boards ask before adopting a sermon
            follow-up tool — from pastoral oversight to AI, members, and visitors.
          </p>
        </div>

        <div className="mt-10">
          <FaqAccordion items={PUBLIC_FAQ} defaultOpenFirst />
        </div>

        <p className="mt-8 text-center text-[14px] text-[#64748b]">
          Want the full list or something specific to your church?{' '}
          <Link href="/faq" className="font-medium text-[#38bdf8] hover:underline">
            View all FAQs
          </Link>{' '}
          or{' '}
          <Link href="/support" className="font-medium text-[#38bdf8] hover:underline">
            contact support
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
