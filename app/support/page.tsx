import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { PUBLIC_SITE, supportEmail } from '@/lib/public-site/config';

export const metadata: Metadata = {
  title: 'Support & contact',
  description: `Get help with ${PUBLIC_SITE.productName} for churches and members.`,
};

export default function SupportPage() {
  const email = supportEmail();

  return (
    <div className="flex min-h-screen flex-col bg-[#05070a] text-[#e2e8f0]">
      <PublicSiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-white">Support & contact</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-[#94a3b8]">
          {PUBLIC_SITE.productName} is operated by {PUBLIC_SITE.legalName}. We help churches deliver
          sermon-based devotionals to their members through a secure admin portal and mobile app.
        </p>

        <section className="mt-10 rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18] p-6">
          <h2 className="text-lg font-semibold text-white">Email support</h2>
          <p className="mt-2 text-[15px] text-[#94a3b8]">
            For account access, privacy requests, billing questions, or technical issues:
          </p>
          <a
            href={`mailto:${email}`}
            className="mt-4 inline-block text-[17px] font-semibold text-[#38bdf8] hover:underline"
          >
            {email}
          </a>
          <p className="mt-4 text-[14px] text-[#64748b]">
            We aim to respond within two business days.
          </p>
        </section>

        <section className="mt-8 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Pastors & church staff</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
              Sign in to the admin portal to manage sermons, devotionals, and your congregation join
              code. New churches can{' '}
              <Link href="/register" className="text-[#38bdf8] hover:underline">
                create an account
              </Link>{' '}
              and set up a workspace from the dashboard.
            </p>
            <Link
              href="/login"
              className="mt-3 inline-block text-[14px] font-semibold text-[#38bdf8] hover:underline"
            >
              Pastor sign in →
            </Link>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Church members</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
              Install the Sermon Recall app on your phone, create an account, and enter the church
              code from your pastor. If you do not have a code, contact your church office directly —
              we cannot add you to a church without your pastor&apos;s invitation or code.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">FAQ</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
              See answers to common questions about joining, devotionals, notifications, and
              privacy in our{' '}
              <Link href="/faq" className="text-[#38bdf8] hover:underline">
                FAQ
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Privacy</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
              Read our{' '}
              <Link href="/privacy" className="text-[#38bdf8] hover:underline">
                privacy policy
              </Link>{' '}
              for details on how we handle your data.
            </p>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
