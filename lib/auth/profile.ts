import type { User } from '@supabase/supabase-js';

import {
  canManageSermonsFromStaff,
  hasPermission,
  legacyRoleToStaffRole,
  type Permission,
  type StaffRole,
} from '@/lib/auth/permissions';

export type UserRole = 'member' | 'pastor' | 'admin';

export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'removed';

export type UserProfile = {
  id: string;
  church_id: string | null;
  full_name: string | null;
  role: UserRole;
};

export type ChurchSummary = {
  id: string;
  name: string;
  church_code: string;
  owner_user_id: string | null;
};

export type ChurchSettingsRow = {
  id: string;
  name: string;
  church_code: string;
  pastor_name: string | null;
  timezone: string;
  require_devotional_approval: boolean;
  sermon_language: string;
};

export type AuthContext = {
  user: Pick<User, 'id' | 'email'>;
  profile: UserProfile;
};

export type StaffAuthContext = AuthContext & {
  membership: {
    id: string;
    church_id: string;
    user_id: string;
    role: StaffRole;
    status: MembershipStatus;
    approved_at: string | null;
  } | null;
  staffRole: StaffRole | null;
  isApprovedStaff: boolean;
};

/** @deprecated Prefer staffRole + hasPermission(). Kept for gradual migration. */
export function canManageSermons(role: UserRole): boolean {
  return role === 'pastor' || role === 'admin';
}

export function canManageSermonsWithStaff(
  profile: UserProfile,
  staffRole: StaffRole | null,
): boolean {
  if (staffRole) return canManageSermonsFromStaff(staffRole);
  return canManageSermons(profile.role);
}

export function staffHasPermission(
  staffRole: StaffRole | null,
  profile: UserProfile,
  permission: Permission,
): boolean {
  const role = staffRole ?? legacyRoleToStaffRole(profile.role);
  return hasPermission(role, permission);
}

/** Sidebar / team page entry — broader than invite-only. */
export function canAccessTeamNav(
  profile: UserProfile,
  staffRole: StaffRole | null,
  options?: { ownerUserId?: string | null; userId?: string },
): boolean {
  if (
    options?.ownerUserId &&
    options?.userId &&
    options.ownerUserId === options.userId
  ) {
    return true;
  }
  if (profile.role === 'admin' || profile.role === 'pastor' || staffRole === 'owner') {
    return true;
  }
  return (
    staffHasPermission(staffRole, profile, 'can_invite_users') ||
    staffHasPermission(staffRole, profile, 'can_approve_users') ||
    staffHasPermission(staffRole, profile, 'can_manage_team') ||
    staffRole === 'associate_pastor' ||
    staffRole === 'elder'
  );
}

export type { Permission, StaffRole };
