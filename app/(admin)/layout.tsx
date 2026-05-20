import Link from 'next/link';

import { staffHasPermission } from '@/lib/auth/profile';
import { canManageSermonsWithStaff } from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';
import { AdminShellProviders } from '@/components/admin/AdminShellProviders';
import { SignOutButton } from '@/components/admin/SignOutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, staffRole } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const pastorCapable = canManageSermonsWithStaff(profile, staffRole);
  const canManageTeam =
    pastorCapable &&
    (staffHasPermission(staffRole, profile, 'can_invite_users') ||
      staffHasPermission(staffRole, profile, 'can_approve_users'));

  const label =
    profile.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Admin';

  return (
    <AdminShellProviders>
    <div className="admin-shell flex min-h-screen bg-admin-page text-admin-fg">
      <aside className="admin-sidebar hidden w-56 shrink-0 flex-col border-r border-admin bg-admin-sidebar p-4 wide:flex">
        <Link href="/dashboard" className="mb-6 inline-block" aria-label="Dashboard home">
          <SermonRecallLogo variant="header" className="h-10 w-auto max-w-[10rem] object-contain" priority />
        </Link>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-admin-dim">
          Church admin
        </p>
        <nav className="admin-nav-stack flex flex-col gap-1 text-[14px]">
          <Link
            href="/dashboard"
            className="rounded-md px-2 py-2 text-admin-muted hover:bg-admin-nav-hover hover:text-admin-accent"
          >
            Dashboard
          </Link>
          <Link
            href="/sermons"
            className="rounded-md px-2 py-2 text-admin-muted hover:bg-admin-nav-hover hover:text-admin-accent"
          >
            Sermons
          </Link>
          {pastorCapable ? (
            <Link
              href="/sermons/new"
              className="rounded-md px-2 py-2 text-admin-muted hover:bg-admin-nav-hover hover:text-admin-accent"
            >
              New sermon
            </Link>
          ) : null}
          {canManageTeam ? (
            <Link
              href="/team"
              className="rounded-md px-2 py-2 text-admin-muted hover:bg-admin-nav-hover hover:text-admin-accent"
            >
              Team
            </Link>
          ) : null}
          <Link
            href="/notifications"
            className="rounded-md px-2 py-2 text-admin-muted hover:bg-admin-nav-hover hover:text-admin-accent"
          >
            Notifications
          </Link>
          <Link
            href="/settings"
            className="rounded-md px-2 py-2 text-admin-muted hover:bg-admin-nav-hover hover:text-admin-accent"
          >
            Settings
          </Link>
        </nav>
        <div className="mt-auto border-t border-admin pt-4">
          <p className="truncate px-2 text-[12px] text-admin-dim" title={user.email}>
            {label}
          </p>
          {church ? (
            <p className="truncate px-2 text-[11px] text-admin-dim" title={church.name}>
              {church.name}
            </p>
          ) : null}
          <SignOutButton />
        </div>
      </aside>
      <div className="admin-main-wrap flex min-h-screen flex-1 flex-col">
        <header className="admin-mobile-header flex items-center justify-between gap-3 border-b border-admin px-4 py-3 wide:hidden">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2" aria-label="Dashboard home">
            <SermonRecallLogo variant="header" className="h-8 w-8 shrink-0 rounded-md object-contain" priority />
            <span className="truncate text-sm font-semibold text-admin-fg-strong">Church admin</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/sermons"
              className="text-xs font-medium text-admin-link hover:underline"
            >
              Sermons
            </Link>
            <Link
              href="/settings"
              className="text-xs font-medium text-admin-link hover:underline"
            >
              Settings
            </Link>
            <SignOutButton className="rounded-md px-2 py-1.5 text-[12px] text-admin-dim hover:text-admin-accent" />
          </div>
        </header>
        <main className="flex-1 px-[clamp(1rem,4vw,2rem)] py-8">{children}</main>
      </div>
    </div>
    </AdminShellProviders>
  );
}
