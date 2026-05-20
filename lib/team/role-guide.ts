import {
  hasPermission,
  INVITABLE_STAFF_ROLES,
  STAFF_ROLE_RANK,
  type Permission,
  type StaffRole,
} from '@/lib/auth/permissions';

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Owner / Main Pastor',
  admin_pastor: 'Admin Pastor',
  associate_pastor: 'Associate Pastor',
  elder: 'Elder',
  contributor: 'Contributor',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  owner:
    'Primary church leader with full access. There should be one owner per church. Can manage the entire team and all content.',
  admin_pastor:
    'Trusted administrator with nearly full access. Can invite and approve team members and manage church operations.',
  associate_pastor:
    'Can create and review devotionals and send notifications, but cannot publish without approval from an owner or admin pastor.',
  elder:
    'Can draft devotionals and submit them for approval. Cannot publish or manage team members.',
  contributor:
    'Content contributor who can draft devotionals for review. Limited administrative access.',
  viewer:
    'Read-only access to church admin content. Cannot edit, publish, or manage the team.',
};

const PERMISSION_LABELS: Record<Permission, string> = {
  can_invite_users: 'Invite team members',
  can_approve_users: 'Approve or reject team requests',
  can_manage_team: 'Manage team roles and remove members',
  can_generate_devotionals: 'Generate devotionals (AI)',
  can_edit_devotionals: 'Edit devotionals',
  can_submit_for_approval: 'Submit devotionals for approval',
  can_approve_devotionals: 'Approve devotionals',
  can_publish_devotionals: 'Publish devotionals to the app',
  can_send_notifications: 'Send push notifications',
  can_schedule_notifications: 'Schedule push notifications',
  can_manage_church_settings: 'Manage church settings',
};

const ALL_PERMISSIONS: Permission[] = [
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
];

export function permissionsForRole(role: StaffRole): Permission[] {
  return ALL_PERMISSIONS.filter((p) => hasPermission(role, p));
}

export function permissionSummary(role: StaffRole): string[] {
  return permissionsForRole(role).map((p) => PERMISSION_LABELS[p]);
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'pending':
      return 'Pending approval';
    case 'pending_invite':
      return 'Invite sent';
    case 'accepted_pending_approval':
      return 'Accepted — awaiting approval';
    case 'removed':
      return 'Removed';
    case 'suspended':
      return 'Suspended';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function formatTeamDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function assignableRolesFor(callerRole: StaffRole | null): StaffRole[] {
  if (!callerRole) return [];
  const rank = STAFF_ROLE_RANK[callerRole] ?? 0;
  return INVITABLE_STAFF_ROLES.filter((r) => (STAFF_ROLE_RANK[r] ?? 0) < rank);
}

export const ROLE_GUIDE_ORDER: StaffRole[] = [
  'owner',
  'admin_pastor',
  'associate_pastor',
  'elder',
  'contributor',
  'viewer',
];
