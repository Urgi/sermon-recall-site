import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { buildMemberJoinUrl, normalizeChurchCode } from '@/lib/church/member-join';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Props = { params: { code: string } };

export default async function MemberJoinPage({ params }: Props) {
  const code = normalizeChurchCode(params.code);
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_church_join_public', { p_code: code });
  if (error || !data?.length) {
    notFound();
  }

  const row = data[0] as { church_name: string; church_code: string };
  const joinUrl = buildMemberJoinUrl(row.church_code);
  const appDeepLink = `sermon-recall://join-church?code=${encodeURIComponent(row.church_code)}`;

  return (
    <div className="min-h-screen bg-[#05070a] px-4 py-10 text-[#e2e8f0]">
      <div className="mx-auto max-w-md text-center">
        <SermonRecallLogo variant="hero" className="mx-auto h-24 w-auto object-contain" />
        <h1 className="mt-8 text-2xl font-bold text-white">Join {row.church_name}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#94a3b8]">
          Open the Sermon Recall app on your phone, sign in, and enter this church code:
        </p>
        <p className="mt-4 font-mono text-3xl font-bold tracking-wider text-[#38bdf8]">
          {normalizeChurchCode(row.church_code)}
        </p>
        <div className="mt-8 space-y-3 text-left text-[14px] text-[#cbd5e1]">
          <p>
            <span className="font-semibold text-white">1.</span> Install Sermon Recall from the App
            Store or Google Play.
          </p>
          <p>
            <span className="font-semibold text-white">2.</span> Sign in with your phone number.
          </p>
          <p>
            <span className="font-semibold text-white">3.</span> On &ldquo;Join your church,&rdquo;
            enter the code above.
          </p>
        </div>
        <a
          href={appDeepLink}
          className="mt-8 inline-block rounded-lg bg-[#0ea5e9] px-5 py-3 text-[15px] font-semibold text-white no-underline hover:bg-[#0284c7]"
        >
          Open in app
        </a>
        <p className="mt-6 text-[12px] text-[#64748b]">
          Pastors: share the QR from your{' '}
          <Link href="/dashboard" className="text-[#38bdf8] hover:underline">
            admin dashboard
          </Link>
          .
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-[#475569]">{joinUrl}</p>
      </div>
    </div>
  );
}
