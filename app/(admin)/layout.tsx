import Link from 'next/link';
import { Suspense } from 'react';

import { AdminMobileHeaderSlot, AdminSidebarSlot } from '@/components/admin/AdminSidebarSlot';
import { AdminShellProviders } from '@/components/admin/AdminShellProviders';
import { SignOutButton } from '@/components/admin/SignOutButton';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShellProviders>
      <div className="admin-shell flex min-h-screen bg-admin-page text-admin-fg">
        <aside className="admin-sidebar hidden w-60 shrink-0 flex-col border-r border-admin bg-admin-sidebar p-4 wide:flex">
          <Link href="/dashboard" className="mb-6 inline-block" aria-label="Dashboard home">
            <SermonRecallLogo variant="header" className="h-10 w-auto max-w-[10rem] object-contain" priority />
          </Link>
          <Suspense fallback={<SidebarNavFallback />}>
            <AdminSidebarSlot />
          </Suspense>
        </aside>
        <div className="admin-main-wrap flex min-h-screen flex-1 flex-col">
          <header className="admin-mobile-header flex items-center justify-between gap-3 border-b border-admin px-4 py-3 wide:hidden">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2" aria-label="Dashboard home">
              <SermonRecallLogo variant="header" className="h-8 w-8 shrink-0 rounded-md object-contain" priority />
              <span className="truncate text-sm font-semibold text-admin-fg-strong">Church admin</span>
            </Link>
            <div className="flex min-w-0 shrink items-center gap-2">
              <Suspense fallback={<MobileNavFallback />}>
                <AdminMobileHeaderSlot />
              </Suspense>
              <SignOutButton className="rounded-md px-2 py-1.5 text-[12px] text-admin-dim hover:text-admin-accent" />
            </div>
          </header>
          <main className="flex-1 px-[clamp(1rem,4vw,2rem)] py-8">{children}</main>
        </div>
      </div>
    </AdminShellProviders>
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
  return <div className="h-4 w-40 rounded bg-[var(--admin-border)]" aria-hidden />;
}
