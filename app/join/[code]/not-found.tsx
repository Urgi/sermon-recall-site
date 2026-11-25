import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { LANGUAGE_COOKIE } from '@/lib/i18n/languages';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { MemberAppStoreLinks } from '@/components/public/MemberAppStoreLinks';

export const metadata: Metadata = { title: 'Church code not found' };

export default function JoinNotFound() {
  const remembered = cookies().get(LANGUAGE_COOKIE)?.value ?? null;
  return (
    <LanguageProvider initialLanguage={remembered} detectBrowserLanguage>
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#05070a] px-4 py-10 text-center text-[#e2e8f0]">
      <Link href="/" aria-label="Sermon Recall home">
        <SermonRecallLogo variant="hero" className="mx-auto h-20 w-auto object-contain" />
      </Link>
      <h1 className="mt-8 text-xl font-bold text-white">
        <AdminChromeCopy k="jp.notFound" />
      </h1>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-[#94a3b8]">
        <AdminChromeCopy k="jp.notFoundHint" />
      </p>
      <MemberAppStoreLinks className="mt-6 justify-center" />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[14px]">
        <Link href="/" className="inline-flex min-h-10 items-center text-[#38bdf8] hover:underline">
          <AdminChromeCopy k="jp.home" />
        </Link>
        <Link href="/login" className="inline-flex min-h-10 items-center text-[#94a3b8] hover:text-[#e2e8f0]">
          <AdminChromeCopy k="jp.pastorSignIn" />
        </Link>
      </div>
    </div>
    </LanguageProvider>
  );
}
