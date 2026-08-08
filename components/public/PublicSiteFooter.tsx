import Link from 'next/link';

import { PUBLIC_SITE, supportEmail } from '@/lib/public-site/config';

export function PublicSiteFooter() {
  const email = supportEmail();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[rgba(56,189,248,0.12)] bg-[#020408] px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-white">{PUBLIC_SITE.productName}</p>
          <p className="mt-1 text-[13px] text-[#64748b]">{PUBLIC_SITE.tagline}</p>
          <p className="mt-3 text-[13px] text-[#94a3b8]">
            © {year} {PUBLIC_SITE.legalName}. All rights reserved.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-[14px]">
          <Link href="/faq" className="text-[#94a3b8] hover:text-[#38bdf8]">
            FAQ
          </Link>
          <Link href="/privacy" className="text-[#94a3b8] hover:text-[#38bdf8]">
            Privacy policy
          </Link>
          <Link href="/support" className="text-[#94a3b8] hover:text-[#38bdf8]">
            Support & contact
          </Link>
          <Link href="/login" className="text-[#94a3b8] hover:text-[#38bdf8]">
            Pastor sign in
          </Link>
          <a href={`mailto:${email}`} className="text-[#94a3b8] hover:text-[#38bdf8]">
            {email}
          </a>
        </div>
      </div>
    </footer>
  );
}
