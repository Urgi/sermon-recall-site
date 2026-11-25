import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Suspense } from 'react';

import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import {
  AdminMobileChurchName,
  AdminMobileHeaderSlot,
  AdminSidebarSlot,
} from '@/components/admin/AdminSidebarSlot';
import { AdminShellProviders } from '@/components/admin/AdminShellProviders';
import { SignOutButton } from '@/components/admin/SignOutButton';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { LANGUAGE_COOKIE } from '@/lib/i18n/languages';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const remembered = cookies().get(LANGUAGE_COOKIE)?.value ?? null;
  return (
    <LanguageProvider initialLanguage={remembered}>
      <AdminShellProviders>
        <div className="admin-shell flex min-h-screen bg-admin-page text-admin-fg">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-admin-card focus:px-3 focus:py-2 focus:text-sm focus:text-admin-fg-strong focus:shadow-lg"
          >
            <AdminChromeCopy k="common.skipToContent" />
          </a>
          <aside className="admin-sidebar hidden w-60 shrink-0 flex-col border-r border-admin bg-admin-sidebar p-4 wide:flex">
            <Link href="/dashboard" className="mb-6 inline-block">
              <SermonRecallLogo variant="header" className="h-10 w-auto max-w-[10rem] object-contain" priority />
              <span className="sr-only">
                <AdminChromeCopy k="nav.dashboardHome" />
              </span>
            </Link>
            <Suspense fallback={<SidebarNavFallback />}>
              <AdminSidebarSlot />
            </Suspense>
          </aside>
          <div className="admin-main-wrap flex min-h-screen min-w-0 flex-1 flex-col">
            <header className="admin-mobile-header flex flex-col items-stretch gap-2 border-b border-admin px-4 py-3 wide:hidden">
              <div className="flex items-center justify-between gap-3">
                <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
                  <SermonRecallLogo variant="header" className="h-8 w-8 shrink-0 rounded-md object-contain" priority />
                  <span className="sr-only">
                    <AdminChromeCopy k="nav.dashboardHome" />
                  </span>
                  <span className="truncate text-sm font-semibold text-admin-fg-strong">
                    <Suspense fallback={<AdminChromeCopy k="nav.churchAdmin" />}>
                      <AdminMobileChurchName fallback={<AdminChromeCopy k="nav.churchAdmin" />} />
                    </Suspense>
                  </span>
                </Link>
                <SignOutButton className="min-h-10 shrink-0 whitespace-nowrap rounded-md px-3 text-[13px] text-admin-muted transition-colors duration-fast hover:bg-admin-nav-hover hover:text-admin-accent" />
              </div>
              <Suspense fallback={<MobileNavFallback />}>
                <AdminMobileHeaderSlot />
              </Suspense>
            </header>
            <main id="main" className="flex-1 px-[clamp(1rem,4vw,2rem)] py-6 wide:py-8">{children}</main>
          </div>
        </div>
      </AdminShellProviders>
    </LanguageProvider>
  );
}

function SidebarNavFallback() {
  return (
    <>
      <div className="flex flex-col gap-1">
        {['Overview', 'Sermons', 'Members', 'Settings'].map((label) => (
          <div
            key={label}
            className="h-9 rounded-lg bg-[var(--admin-nav-hover-bg)]"
            aria-hidden
          />
        ))}
      </div>
      <div className="mt-auto border-t border-admin pt-4">
        <div className="mx-2 h-3 w-24 rounded bg-[var(--admin-border)]" />
      </div>
    </>
  );
}

function MobileNavFallback() {
  return <div className="h-9 w-full rounded-full bg-[var(--admin-border)]" aria-hidden />;
}
