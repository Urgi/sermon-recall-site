import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Suspense } from 'react';

import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import { AdminSidebarSlot, AdminTopBarSlot } from '@/components/admin/AdminSidebarSlot';
import { AdminShellProviders } from '@/components/admin/AdminShellProviders';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { LANGUAGE_COOKIE } from '@/lib/i18n/languages';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const remembered = cookies().get(LANGUAGE_COOKIE)?.value ?? null;
  const compactBrand = (
    <Link href="/dashboard" className="flex items-center">
      <SermonRecallLogo variant="header" className="h-8 w-8 shrink-0 rounded-lg object-contain" priority />
      <span className="sr-only">
        <AdminChromeCopy k="nav.dashboardHome" />
      </span>
    </Link>
  );
  return (
    <LanguageProvider initialLanguage={remembered}>
      <AdminShellProviders>
        <div className="admin-shell flex min-h-screen text-admin-fg">
          <div className="admin-backdrop" aria-hidden />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[95] focus:rounded-md focus:bg-admin-card focus:px-3 focus:py-2 focus:text-sm focus:text-admin-fg-strong focus:shadow-lg"
          >
            <AdminChromeCopy k="common.skipToContent" />
          </a>
          <aside className="admin-sidebar sticky top-0 hidden h-screen w-64 shrink-0 wide:flex">
            <div className="admin-sidebar-panel flex min-h-0 w-full flex-1 flex-col overflow-y-auto p-4">
              <Link href="/dashboard" className="mb-7 inline-block px-1">
                <SermonRecallLogo variant="header" className="h-10 w-auto max-w-[10rem] object-contain" priority />
                <span className="sr-only">
                  <AdminChromeCopy k="nav.dashboardHome" />
                </span>
              </Link>
              <Suspense fallback={<SidebarNavFallback />}>
                <AdminSidebarSlot />
              </Suspense>
            </div>
          </aside>
          <div className="admin-main-wrap flex min-h-screen min-w-0 flex-1 flex-col">
            <Suspense fallback={<TopBarFallback brand={compactBrand} />}>
              <AdminTopBarSlot brand={compactBrand} />
            </Suspense>
            <main id="main" className="flex-1 px-[clamp(1rem,3vw,2rem)] py-6 wide:py-8">
              {children}
            </main>
          </div>
        </div>
      </AdminShellProviders>
    </LanguageProvider>
  );
}

function SidebarNavFallback() {
  return (
    <>
      <div className="flex flex-col gap-1.5 pl-3" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 rounded-xl bg-[var(--admin-nav-hover-bg)]" />
        ))}
      </div>
      <div className="mt-auto pt-4">
        <div className="glass-inner h-14" aria-hidden />
      </div>
    </>
  );
}

function TopBarFallback({ brand }: { brand: React.ReactNode }) {
  return (
    <header className="admin-topbar sticky top-0 z-40">
      <div className="flex h-14 items-center gap-2 px-[clamp(1rem,3vw,2rem)] wide:h-16">
        <div className="wide:hidden">{brand}</div>
        <div className="ml-auto h-9 w-28 rounded-full bg-[var(--admin-nav-hover-bg)]" aria-hidden />
      </div>
    </header>
  );
}
