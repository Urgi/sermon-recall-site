import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { HomeFaqSection } from '@/components/public/HomeFaqSection';
import { MemberAppStoreLinks } from '@/components/public/MemberAppStoreLinks';
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { PUBLIC_SITE, supportEmail } from '@/lib/public-site/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Sermon Recall — Church devotional app',
  description: PUBLIC_SITE.shortDescription,
  openGraph: {
    title: 'Sermon Recall',
    description: PUBLIC_SITE.shortDescription,
    type: 'website',
  },
};

export default async function PublicHomePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  const email = supportEmail();

  return (
    <div className="flex min-h-screen flex-col bg-[#05070a] text-[#e2e8f0]">
      <PublicSiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <SermonRecallLogo variant="hero" className="mx-auto h-28 w-auto" priority />
            <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.2em] text-[#38bdf8]">
              {PUBLIC_SITE.tagline}
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Help your church remember and live out Saturday/Sunday&apos;s message
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-[#94a3b8]">
              {PUBLIC_SITE.shortDescription} Pastors prepare a six-day cycle from each sermon;
              members follow daily devotionals on their phones with spaced reminders to stay
              engaged all week.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="w-full rounded-lg bg-[#0ea5e9] px-6 py-3 text-center text-[15px] font-semibold text-white hover:bg-[#0284c7] sm:w-auto"
              >
                Pastor sign in
              </Link>
              <Link
                href="/register"
                className="w-full rounded-lg border border-[rgba(56,189,248,0.35)] bg-[#0a0f18] px-6 py-3 text-center text-[15px] font-semibold text-[#38bdf8] hover:bg-[#0f172a] sm:w-auto"
              >
                Create church account
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-[rgba(56,189,248,0.1)] bg-[#0a0f18]/50 px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            <article className="rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#05070a] p-6">
              <h2 className="text-lg font-semibold text-white">For pastors & church staff</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
                Upload or paste sermon content, review AI-generated devotionals, and publish a
                six-day journey for your congregation. Track engagement from a secure web admin
                portal.
              </p>
              <ul className="mt-4 space-y-2 text-[14px] text-[#cbd5e1]">
                <li>• Sermon ingestion and devotional review workflow</li>
                <li>• Member join codes and shareable links</li>
                <li>• Congregation engagement overview</li>
              </ul>
              <Link href="/login" className="mt-5 inline-block text-[14px] font-semibold text-[#38bdf8] hover:underline">
                Sign in to admin portal →
              </Link>
            </article>

            <article className="rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#05070a] p-6">
              <h2 className="text-lg font-semibold text-white">For church members</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
                Members use the Sermon Recall app on Android (iPhone coming soon). Your pastor
                shares a church code; you create an account with email, join your church, and open
                each day&apos;s devotional with guided reflection and application.
              </p>
              <ul className="mt-4 space-y-2 text-[14px] text-[#cbd5e1]">
                <li>• Daily devotionals tied to your church&apos;s sermon series</li>
                <li>• Optional reminders to stay on rhythm through the week</li>
                <li>• Private progress on your own account</li>
              </ul>
              <MemberAppStoreLinks className="mt-5" />
              <p className="mt-4 text-[14px] text-[#64748b]">
                Ask your pastor for your church&apos;s join code or link.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-xl font-semibold text-white">How it works</h2>
          <ol className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Pastor publishes',
                body: 'Staff upload a sermon and publish a reviewed six-day devotional cycle.',
              },
              {
                step: '2',
                title: 'Members join',
                body: 'Congregation members install the app and enter the church code from their pastor.',
              },
              {
                step: '3',
                title: 'Daily growth',
                body: 'Members complete each day with scripture, reflection, and an application commitment.',
              },
            ].map((item) => (
              <li key={item.step} className="text-center">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0ea5e9]/15 text-[15px] font-bold text-[#38bdf8]">
                  {item.step}
                </span>
                <h3 className="mt-3 text-[15px] font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <HomeFaqSection />

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-lg font-semibold text-white">Questions or support</h2>
            <p className="mt-2 text-[15px] text-[#94a3b8]">
              Churches and members can reach us for account help, privacy requests, or general
              questions.
            </p>
            <p className="mt-4">
              <a
                href={`mailto:${email}`}
                className="text-[15px] font-semibold text-[#38bdf8] hover:underline"
              >
                {email}
              </a>
            </p>
            <Link href="/#faq" className="mt-3 inline-block text-[14px] text-[#64748b] hover:text-[#94a3b8]">
              Read the FAQ →
            </Link>
            <Link href="/support" className="mt-1 inline-block text-[14px] text-[#64748b] hover:text-[#94a3b8]">
              Visit support page →
            </Link>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
