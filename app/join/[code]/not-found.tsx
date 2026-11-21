import type { Metadata } from 'next';
import Link from 'next/link';

import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { MemberAppStoreLinks } from '@/components/public/MemberAppStoreLinks';

export const metadata: Metadata = { title: 'Church code not found' };

export default function JoinNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#05070a] px-4 py-10 text-center text-[#e2e8f0]">
      <Link href="/" aria-label="Sermon Recall home">
        <SermonRecallLogo variant="hero" className="mx-auto h-20 w-auto object-contain" />
      </Link>
      <h1 className="mt-8 text-xl font-bold text-white">Church code not found</h1>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-[#94a3b8]">
        Double-check the code with your pastor. Codes look like GRACE001. You can also install the
        app and enter the code there.
      </p>
      <MemberAppStoreLinks className="mt-6 justify-center" />
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[14px]">
        <Link href="/" className="inline-flex min-h-10 items-center text-[#38bdf8] hover:underline">
          Sermon Recall home
        </Link>
        <Link href="/login" className="inline-flex min-h-10 items-center text-[#94a3b8] hover:text-[#e2e8f0]">
          Pastor sign in
        </Link>
      </div>
    </div>
  );
}
