import Link from 'next/link';

import { canManageSermons } from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { SignOutButton } from '@/components/admin/SignOutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const pastorCapable = canManageSermons(profile.role);

  const label =
    profile.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Admin';

  return (
    <div className="admin-shell flex min-h-screen bg-[#05070a] text-[#e2e8f0]">
      <aside className="admin-sidebar hidden w-56 shrink-0 flex-col border-r border-[rgba(56,189,248,0.12)] bg-[#020408] p-4 wide:flex">
        <Link href="/dashboard" className="mb-6 inline-block" aria-label="Dashboard home">
          <SermonRecallLogo variant="header" className="h-10 w-auto max-w-[10rem] object-contain" priority />
        </Link>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748b]">
          Church admin
        </p>
        <nav className="admin-nav-stack flex flex-col gap-1 text-[14px]">
          <Link
            href="/dashboard"
            className="rounded-md px-2 py-2 text-[#94a3b8] hover:bg-[#0a0f18] hover:text-[#38bdf8]"
          >
            Dashboard
          </Link>
          <Link
            href="/sermons"
            className="rounded-md px-2 py-2 text-[#94a3b8] hover:bg-[#0a0f18] hover:text-[#38bdf8]"
          >
            Sermons
          </Link>
          {pastorCapable ? (
            <Link
              href="/sermons/new"
              className="rounded-md px-2 py-2 text-[#94a3b8] hover:bg-[#0a0f18] hover:text-[#38bdf8]"
            >
              New sermon
            </Link>
          ) : null}
        </nav>
        <div className="mt-auto border-t border-[rgba(56,189,248,0.1)] pt-4">
          <p className="truncate px-2 text-[12px] text-[#64748b]" title={user.email}>
            {label}
          </p>
          {church ? (
            <p className="truncate px-2 text-[11px] text-[#475569]" title={church.name}>
              {church.name}
            </p>
          ) : null}
          <SignOutButton />
        </div>
      </aside>
      <div className="admin-main-wrap flex min-h-screen flex-1 flex-col">
        <header className="admin-mobile-header flex items-center justify-between gap-3 border-b border-[rgba(56,189,248,0.12)] px-4 py-3 wide:hidden">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2" aria-label="Dashboard home">
            <SermonRecallLogo variant="header" className="h-8 w-8 shrink-0 rounded-md object-contain" priority />
            <span className="truncate text-sm font-semibold text-white">Church admin</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/sermons"
              className="text-xs font-medium text-[#38bdf8] hover:underline"
            >
              Sermons
            </Link>
            <SignOutButton className="rounded-md px-2 py-1.5 text-[12px] text-[#64748b] hover:text-[#38bdf8]" />
          </div>
        </header>
        <main className="flex-1 px-[clamp(1rem,4vw,2rem)] py-8">{children}</main>
      </div>
    </div>
  );
}
