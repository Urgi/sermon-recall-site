/**
 * Staff role permissions — must stay in sync with
 * supabase migration `has_church_permission()` SQL function.
 */

export type StaffRole =
  | 'owner'
  | 'admin_pastor'
  | 'associate_pastor'
  | 'elder'
  | 'contributor'
  | 'viewer';

export type Permission =
  | 'can_invite_users'
  | 'can_approve_users'
  | 'can_manage_team'
  | 'can_generate_devotionals'
  | 'can_edit_devotionals'
  | 'can_submit_for_approval'
  | 'can_approve_devotionals'
  | 'can_publish_devotionals'
  | 'can_send_notifications'
  | 'can_schedule_notifications'
  | 'can_manage_church_settings';

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>([
    'can_invite_users',
    'can_approve_users',
    'can_manage_team',
    'can_generate_devotionals',
    'can_edit_devotionals',
    'can_submit_for_approval',
    'can_approve_devotionals',
    'can_publish_devotionals',
    'can_send_notifications',
    'can_schedule_notifications',
    'can_manage_church_settings',
  ]),
  admin_pastor: new Set<Permission>([
    'can_invite_users',
    'can_approve_users',
    'can_manage_team',
    'can_generate_devotionals',
    'can_edit_devotionals',
    'can_submit_for_approval',
    'can_approve_devotionals',
    'can_publish_devotionals',
    'can_send_notifications',
    'can_schedule_notifications',
    'can_manage_church_settings',
  ]),
  associate_pastor: new Set<Permission>([
    'can_generate_devotionals',
    'can_edit_devotionals',
    'can_submit_for_approval',
    'can_approve_devotionals',
    'can_send_notifications',
    'can_schedule_notifications',
  ]),
  elder: new Set<Permission>([
    'can_generate_devotionals',
    'can_edit_devotionals',
    'can_submit_for_approval',
  ]),
  contributor: new Set<Permission>([
    'can_generate_devotionals',
    'can_edit_devotionals',
    'can_submit_for_approval',
  ]),
  viewer: new Set<Permission>([]),
};

/** Roles the inviter may assign (cannot assign equal or higher than self). */
export const STAFF_ROLE_RANK: Record<StaffRole, number> = {
  owner: 100,
  admin_pastor: 90,
  associate_pastor: 70,
  elder: 50,
  contributor: 40,
  viewer: 10,
};

export const INVITABLE_STAFF_ROLES: StaffRole[] = [
  'admin_pastor',
  'associate_pastor',
  'elder',
  'contributor',
  'viewer',
];

export function hasPermission(role: StaffRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function canAssignRole(
  inviterRole: StaffRole | null | undefined,
  targetRole: StaffRole,
): boolean {
  if (!inviterRole) return false;
  const inviterRank = STAFF_ROLE_RANK[inviterRole] ?? 0;
  const targetRank = STAFF_ROLE_RANK[targetRole] ?? 0;
  return inviterRank > targetRank;
}

/** Legacy bridge: map users.role to staff role when no membership row exists yet. */
export function legacyRoleToStaffRole(
  role: 'member' | 'pastor' | 'admin',
): StaffRole | null {
  if (role === 'admin') return 'owner';
  if (role === 'pastor') return 'admin_pastor';
  return null;
}

/** Combined check for sermon management (legacy + permissions). */
export function canManageSermonsFromStaff(role: StaffRole | null | undefined): boolean {
  return hasPermission(role, 'can_generate_devotionals');
}
