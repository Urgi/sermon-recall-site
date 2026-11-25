import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { LANGUAGE_COOKIE } from '@/lib/i18n/languages';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { MemberAppStoreLinks } from '@/components/public/MemberAppStoreLinks';
import { buildMemberJoinUrl, normalizeChurchCode } from '@/lib/church/member-join';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/public-site/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Props = { params: { code: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc('get_church_join_public', {
    p_code: normalizeChurchCode(params.code),
  });
  const name = (data?.[0] as { church_name?: string } | undefined)?.church_name;
  return { title: name ? `Join ${name}` : 'Church code not found' };
}

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

  const remembered = cookies().get(LANGUAGE_COOKIE)?.value ?? null;

  return (
    <LanguageProvider initialLanguage={remembered} detectBrowserLanguage>
    <div className="min-h-screen bg-[#05070a] px-4 py-10 text-[#e2e8f0]">
      <div className="mx-auto max-w-md text-center">
        <SermonRecallLogo variant="hero" className="mx-auto h-24 w-auto object-contain" />
        <h1 className="mt-8 text-2xl font-bold text-white">
          <AdminChromeCopy k="jp.title" vars={{ church: row.church_name }} />
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#94a3b8]">
          <AdminChromeCopy k="jp.open" />
        </p>
        <p className="mt-4 font-mono text-3xl font-bold tracking-wider text-[#38bdf8]">
          {normalizeChurchCode(row.church_code)}
        </p>
        <div className="mt-8 space-y-3 text-left text-[14px] text-[#cbd5e1]">
          <p>
            <span className="font-semibold text-white">1.</span> <AdminChromeCopy k="jp.step1a" />{' '}
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#38bdf8] hover:underline"
            >
              App Store
            </a>{' '}
            <AdminChromeCopy k="jp.or" />{' '}
            <a
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#38bdf8] hover:underline"
            >
              Google Play
            </a>
            .
          </p>
          <p>
            <span className="font-semibold text-white">2.</span> <AdminChromeCopy k="jp.step2" />
          </p>
          <p>
            <span className="font-semibold text-white">3.</span> <AdminChromeCopy k="jp.step3" />
          </p>
        </div>
        <MemberAppStoreLinks className="mt-8 justify-center" />
        <a
          href={appDeepLink}
          className="mt-4 inline-block rounded-lg bg-[#0379bd] px-5 py-3 text-[15px] font-semibold text-white no-underline hover:bg-[#0369a1]"
        >
          <AdminChromeCopy k="jp.openApp" />
        </a>
        <p className="mt-2 text-[12px] text-[#94a3b8]">
          <AdminChromeCopy k="jp.worksOn" />
        </p>
        <p className="mt-6 text-[12px] text-[#94a3b8]">
          <AdminChromeCopy k="jp.pastors" />{' '}
          <Link href="/dashboard" className="text-[#38bdf8] hover:underline">
            <AdminChromeCopy k="jp.dashboard" />
          </Link>
          .
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-[#94a3b8]">{joinUrl}</p>
      </div>
    </div>
    </LanguageProvider>
  );
}
