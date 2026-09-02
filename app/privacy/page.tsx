import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { PUBLIC_SITE, publicSiteUrl, supportEmail } from '@/lib/public-site/config';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `Privacy policy for ${PUBLIC_SITE.productName} mobile app and church admin services.`,
};

export default function PrivacyPage() {
  const email = supportEmail();
  const site = publicSiteUrl();
  const updated = 'June 12, 2026';

  return (
    <div className="flex min-h-screen flex-col bg-[#05070a] text-[#e2e8f0]">
      <PublicSiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-white">Privacy policy</h1>
        <p className="mt-2 text-[14px] text-[#64748b]">Last updated: {updated}</p>

        <div className="prose prose-invert mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-[#cbd5e1]">
          <p>
            {PUBLIC_SITE.legalName} (&ldquo;we,&rdquo; &ldquo;us&rdquo;) operates {PUBLIC_SITE.productName} — a
            mobile application for church members and a web admin portal for authorized church
            staff. This policy describes how we collect, use, and protect information when you use
            our services at {site} and in our mobile apps.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-white">Information we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-[#e2e8f0]">Account information</strong> — email address, name,
                and sign-in codes (handled securely via our authentication provider).
              </li>
              <li>
                <strong className="text-[#e2e8f0]">Church association</strong> — church code or
                membership link you use to join a congregation workspace.
              </li>
              <li>
                <strong className="text-[#e2e8f0]">Devotional activity</strong> — progress on sermon
                cycles, reflection responses, and application commitments you choose to submit in
                the app.
              </li>
              <li>
                <strong className="text-[#e2e8f0]">Device tokens</strong> — if you enable reminders,
                we store a push notification token to send devotional reminders you request.
              </li>
              <li>
                <strong className="text-[#e2e8f0]">Sermon content</strong> — text, audio, or links
                uploaded by authorized church staff for transcription and devotional generation.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">How we use information</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Provide and improve the Sermon Recall member app and pastor admin portal.</li>
              <li>Generate and deliver church-specific devotional content authorized by your church.</li>
              <li>Send optional push notifications you configure (reminders, church announcements).</li>
              <li>Show aggregated, anonymized engagement metrics to authorized church staff.</li>
              <li>Maintain security, prevent abuse, and comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Sharing</h2>
            <p className="mt-3">
              We do not sell personal information. Data is shared only with service providers that
              help us operate the product (hosting, authentication, push delivery, transcription,
              and AI content generation), under contracts that require appropriate safeguards. Church
              staff authorized by your church may view engagement summaries and anonymized commitment
              themes for pastoral care purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Data retention & deletion</h2>
            <p className="mt-3">
              We retain account and progress data while your account is active. You may delete your
              account from the mobile app settings or contact us to request deletion. Church staff
              accounts are managed by your church administrators.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Children</h2>
            <p className="mt-3">
              Sermon Recall is intended for use by church congregations under the direction of their
              church. We do not knowingly collect information from children under 13 without
              appropriate parental or church consent. Contact us if you believe a child has provided
              personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p className="mt-3">
              Privacy questions or requests:{' '}
              <a href={`mailto:${email}`} className="text-[#38bdf8] hover:underline">
                {email}
              </a>
              . See also our{' '}
              <Link href="/support" className="text-[#38bdf8] hover:underline">
                support page
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
