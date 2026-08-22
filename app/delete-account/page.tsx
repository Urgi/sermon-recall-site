import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { PUBLIC_SITE, supportEmail } from '@/lib/public-site/config';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: `How to delete your ${PUBLIC_SITE.productName} account and associated data.`,
};

export default function DeleteAccountPage() {
  const email = supportEmail();

  return (
    <div className="flex min-h-screen flex-col bg-[#05070a] text-[#e2e8f0]">
      <PublicSiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-white">Delete your Sermon Recall account</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-[#94a3b8]">
          This page explains how members and pastors can request deletion of a{' '}
          {PUBLIC_SITE.productName} account and what data is removed.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-white">Delete from the mobile app (members)</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[#cbd5e1]">
            <li>Open the Sermon Recall app and sign in.</li>
            <li>Go to <strong className="text-white">Settings</strong>.</li>
            <li>
              Choose <strong className="text-white">Delete account</strong> and follow the
              confirmation steps.
            </li>
          </ol>
          <p className="text-[15px] leading-relaxed text-[#94a3b8]">
            Deletion is permanent. You will lose access to devotionals, progress, and church
            membership tied to that account.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-white">Delete from the admin portal (pastors / staff)</h2>
          <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-[#cbd5e1]">
            <li>
              Sign in at{' '}
              <Link href="/login" className="text-[#38bdf8] hover:underline">
                the admin portal
              </Link>
              .
            </li>
            <li>
              Open <strong className="text-white">Settings</strong> and use{' '}
              <strong className="text-white">Delete account</strong>.
            </li>
          </ol>
          <p className="text-[15px] leading-relaxed text-[#94a3b8]">
            Church owners may need to transfer ownership or dissolve the church workspace before
            their personal account can be removed. Contact support if you are blocked.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-white">Request deletion by email</h2>
          <p className="text-[15px] leading-relaxed text-[#cbd5e1]">
            If you cannot access the app or portal, email{' '}
            <a href={`mailto:${email}?subject=Delete%20Sermon%20Recall%20account`} className="font-semibold text-[#38bdf8] hover:underline">
              {email}
            </a>{' '}
            from the address on your account. Include your full name and ask us to delete your
            Sermon Recall account. We aim to complete requests within 30 days.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-white">What is deleted</h2>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#cbd5e1]">
            <li>Your login identity (email) and profile</li>
            <li>Church membership / role links for your user</li>
            <li>Personal progress, reflection responses, and related app data we store for you</li>
          </ul>
          <p className="text-[15px] leading-relaxed text-[#94a3b8]">
            Aggregated or anonymized analytics that cannot identify you may be retained. Content
            your church created (sermons, devotionals) is owned by the church and is not removed
            when a single member deletes their account. Legal or security logs may be kept for a
            limited period where required.
          </p>
        </section>

        <p className="mt-10 text-[14px] text-[#64748b]">
          See also our{' '}
          <Link href="/privacy" className="text-[#38bdf8] hover:underline">
            privacy policy
          </Link>{' '}
          and{' '}
          <Link href="/support" className="text-[#38bdf8] hover:underline">
            support page
          </Link>
          .
        </p>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
