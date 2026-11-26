import { cache } from 'react';

import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { SignOutButton } from '@/components/admin/SignOutButton';
import {
  canAccessTeamNav,
  canManageSermonsWithStaff,
  staffHasPermission,
} from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** Permissions, counts and labels shared by the sidebar, the top bar and the phone drawer. */
const loadAdminChrome = cache(async () => {
  const { user, profile, staffRole, isApprovedStaff } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const canViewTeam = canAccessTeamNav(profile, staffRole, {
    ownerUserId: church?.owner_user_id,
    userId: user.id,
  });
  const canViewNotifications =
    isApprovedStaff && staffHasPermission(staffRole, profile, 'can_send_notifications');
  const canPublish =
    isApprovedStaff && Boolean(profile.church_id) && canManageSermonsWithStaff(profile, staffRole);
  const label = profile.full_name?.trim() || user.email?.split('@')[0] || 'Admin';
  const [memberCount, teamCount] = await Promise.all([
    loadMemberCount(Boolean(church) && isApprovedStaff),
    loadTeamCount(Boolean(church) && canViewTeam),
  ]);
  return {
    perms: { canViewTeam, canViewNotifications, canPublish },
    counts: { memberCount, teamCount },
    label,
    email: user.email ?? undefined,
    churchName: church?.name ?? null,
  };
});

export async function AdminSidebarSlot() {
  const { perms, counts, label, email, churchName } = await loadAdminChrome();
  return (
    <>
      <div className="pl-3">
        <AdminSidebarNav {...perms} {...counts} />
      </div>
      <div className="mt-auto pt-4">
        <AdminAccountBlock label={label} email={email} churchName={churchName} />
      </div>
    </>
  );
}

export async function AdminTopBarSlot({ brand }: { brand: React.ReactNode }) {
  const { perms, counts, label, email, churchName } = await loadAdminChrome();
  return (
    <AdminTopBar
      {...perms}
      {...counts}
      brand={brand}
      account={<AdminAccountBlock label={label} email={email} churchName={churchName} />}
    />
  );
}

function AdminAccountBlock({
  label,
  email,
  churchName,
}: {
  label: string;
  email?: string;
  churchName: string | null;
}) {
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'A';
  return (
    <div className="glass-inner flex items-center gap-3 p-2.5">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-blue-500 text-[13px] font-semibold text-[#071226]"
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--admin-fg-strong)]" title={email}>
          {label}
        </p>
        {churchName ? (
          <p className="truncate text-[12px] text-[var(--admin-muted)]" title={churchName}>
            {churchName}
          </p>
        ) : null}
      </div>
      <SignOutButton variant="icon" />
    </div>
  );
}

const loadMemberCount = cache(async (enabled: boolean): Promise<number | null> => {
  if (!enabled) return null;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('pastor_church_member_count');
  if (error) return null;
  const n = Number(data);
  return Number.isFinite(n) ? n : null;
});

const loadTeamCount = cache(async (enabled: boolean): Promise<number | null> => {
  if (!enabled) return null;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('get_church_team_snapshot');
  if (error || !data) return null;
  const snapshot = data as {
    owner?: unknown | null;
    active_members?: unknown[] | null;
  };
  const count =
    (snapshot.owner ? 1 : 0) +
    (Array.isArray(snapshot.active_members) ? snapshot.active_members.length : 0);
  return count;
});
