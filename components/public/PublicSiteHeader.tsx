import Link from 'next/link';

import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';

export function PublicSiteHeader() {
  return (
    <header className="border-b border-[rgba(56,189,248,0.12)] bg-[#05070a]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Sermon Recall home">
          <SermonRecallLogo variant="header" className="h-9 w-auto" priority />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/faq"
            className="hidden text-[14px] font-medium text-[#94a3b8] hover:text-[#e2e8f0] sm:inline"
          >
            FAQ
          </Link>
          <Link
            href="/support"
            className="hidden text-[14px] font-medium text-[#94a3b8] hover:text-[#e2e8f0] sm:inline"
          >
            Support
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[rgba(56,189,248,0.35)] bg-[#0a0f18] px-3 py-2 text-[14px] font-semibold text-[#38bdf8] hover:bg-[#0f172a] sm:px-4"
          >
            Pastor sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
