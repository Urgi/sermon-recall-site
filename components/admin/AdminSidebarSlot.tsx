import { cache } from 'react';

import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';
import { SignOutButton } from '@/components/admin/SignOutButton';
import { canAccessTeamNav, staffHasPermission } from '@/lib/auth/profile';
import { getChurchForProfile, requireAdminSession } from '@/lib/auth/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function AdminSidebarSlot() {
  const { user, profile, staffRole, isApprovedStaff } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const canViewTeam = canAccessTeamNav(profile, staffRole, {
    ownerUserId: church?.owner_user_id,
    userId: user.id,
  });
  const canViewNotifications =
    isApprovedStaff && staffHasPermission(staffRole, profile, 'can_send_notifications');
  const label = profile.full_name?.trim() || user.email?.split('@')[0] || 'Admin';
  const memberCount = await loadMemberCount(Boolean(church) && isApprovedStaff);

  return (
    <>
      <AdminSidebarNav
        canViewTeam={canViewTeam}
        canViewNotifications={canViewNotifications}
        memberCount={memberCount}
      />
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
    </>
  );
}

export async function AdminMobileHeaderSlot() {
  const { user, profile, staffRole, isApprovedStaff } = await requireAdminSession();
  const church = await getChurchForProfile(profile.church_id);
  const canViewTeam = canAccessTeamNav(profile, staffRole, {
    ownerUserId: church?.owner_user_id,
    userId: user.id,
  });
  const canViewNotifications =
    isApprovedStaff && staffHasPermission(staffRole, profile, 'can_send_notifications');

  const memberCount = await loadMemberCount(Boolean(church) && isApprovedStaff);

  return (
    <AdminSidebarNav
      canViewTeam={canViewTeam}
      canViewNotifications={canViewNotifications}
      memberCount={memberCount}
      variant="compact"
    />
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
