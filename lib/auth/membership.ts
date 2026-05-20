import type { MembershipStatus, StaffAuthContext, UserProfile } from '@/lib/auth/profile';
import {
  canManageSermonsFromStaff,
  legacyRoleToStaffRole,
  STAFF_ROLE_RANK,
  type StaffRole,
} from '@/lib/auth/permissions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type ChurchMembershipRow = {
  id: string;
  church_id: string;
  user_id: string;
  role: StaffRole;
  status: MembershipStatus;
  approved_at: string | null;
};

export async function loadMembership(
  userId: string,
  churchId: string | null,
): Promise<ChurchMembershipRow | null> {
  if (!churchId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('church_memberships')
    .select('id, church_id, user_id, role, status, approved_at')
    .eq('user_id', userId)
    .eq('church_id', churchId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ChurchMembershipRow;
}

/** @deprecated Use loadMembership */
export const loadActiveMembership = loadMembership;

export function resolveStaffRole(
  profile: UserProfile,
  membership: ChurchMembershipRow | null,
): StaffRole | null {
  const legacy = legacyRoleToStaffRole(profile.role);
  let fromMembership: StaffRole | null = null;
  if (membership?.status === 'active' || membership?.status === 'pending') {
    fromMembership = membership.role;
  }
  if (!fromMembership) return legacy;
  if (!legacy) return fromMembership;
  return STAFF_ROLE_RANK[fromMembership] >= STAFF_ROLE_RANK[legacy]
    ? fromMembership
    : legacy;
}

export function isApprovedStaff(
  profile: UserProfile,
  membership: ChurchMembershipRow | null,
): boolean {
  if (membership?.status === 'pending' || membership?.status === 'suspended') {
    return false;
  }
  if (membership?.status === 'active') {
    return canManageSermonsFromStaff(membership.role);
  }
  return profile.role === 'pastor' || profile.role === 'admin';
}

export async function buildStaffAuthContext(
  user: StaffAuthContext['user'],
  profile: UserProfile,
): Promise<StaffAuthContext> {
  const membership = await loadMembership(profile.id, profile.church_id);
  const staffRole = resolveStaffRole(profile, membership);

  return {
    user,
    profile,
    membership,
    staffRole,
    isApprovedStaff: isApprovedStaff(profile, membership),
  };
}
