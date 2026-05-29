import {
  hasPermission,
  type Permission,
  type StaffRole,
} from '@/lib/auth/permissions';

/** Column order for the permissions matrix (matches backend roles). */
export const MATRIX_ROLES: StaffRole[] = [
  'owner',
  'admin_pastor',
  'associate_pastor',
  'elder',
  'contributor',
  'viewer',
];

/**
 * Matrix rows: each maps to one or more backend Permission keys.
 * Cell is allowed only if every listed permission is granted for that role.
 */
export type PermissionMatrixRow = {
  id: string;
  label: string;
  /** Backend permission key(s) — all must pass for a checkmark. */
  permissions: Permission[];
  tooltip: string;
};

export const PERMISSION_MATRIX_ROWS: PermissionMatrixRow[] = [
  {
    id: 'invite_users',
    label: 'Invite users',
    permissions: ['can_invite_users'],
    tooltip: 'Send email invitations to join the church team.',
  },
  {
    id: 'approve_users',
    label: 'Approve users',
    permissions: ['can_approve_users'],
    tooltip: 'Approve or reject staff after they accept an invite.',
  },
  {
    id: 'manage_team',
    label: 'Manage team members',
    permissions: ['can_manage_team'],
    tooltip: 'Change roles for active team members (owner and admin pastor only).',
  },
  {
    id: 'remove_team',
    label: 'Remove team members',
    permissions: ['can_manage_team'],
    tooltip: 'Remove staff from the church workspace (same access as manage team).',
  },
  {
    id: 'generate_devotionals',
    label: 'Generate devotionals',
    permissions: ['can_generate_devotionals'],
    tooltip: 'Run AI generation and transcription workflows.',
  },
  {
    id: 'edit_devotionals',
    label: 'Edit devotionals',
    permissions: ['can_edit_devotionals'],
    tooltip: 'Edit devotional content in the admin portal.',
  },
  {
    id: 'submit_for_approval',
    label: 'Submit for approval',
    permissions: ['can_submit_for_approval'],
    tooltip: 'Submit generated devotionals for pastor review.',
  },
  {
    id: 'approve_devotionals',
    label: 'Approve devotionals',
    permissions: ['can_approve_devotionals'],
    tooltip: 'Approve or request changes on submitted devotionals.',
  },
  {
    id: 'publish_devotionals',
    label: 'Publish devotionals',
    permissions: ['can_publish_devotionals'],
    tooltip: 'Publish approved content to the member app.',
  },
  {
    id: 'send_notifications',
    label: 'Send notifications',
    permissions: ['can_send_notifications'],
    tooltip: 'Send immediate push notifications to members.',
  },
  {
    id: 'manage_church_settings',
    label: 'Manage church settings',
    permissions: ['can_manage_church_settings'],
    tooltip: 'Update church profile and workspace settings.',
  },
  {
    id: 'view_analytics',
    label: 'View analytics',
    permissions: ['can_generate_devotionals'],
    tooltip:
      'View member engagement on the dashboard (same access gate as sermon management today).',
  },
];

/** True when this role has all permissions required for the matrix row. */
export function roleHasMatrixRow(role: StaffRole, row: PermissionMatrixRow): boolean {
  return row.permissions.every((p) => hasPermission(role, p));
}

/** Build full matrix data for rendering (derived from ROLE_PERMISSIONS via hasPermission). */
export function buildPermissionMatrix(): {
  roles: StaffRole[];
  rows: PermissionMatrixRow[];
  cells: boolean[][];
} {
  const rows = PERMISSION_MATRIX_ROWS;
  const cells = rows.map((row) => MATRIX_ROLES.map((role) => roleHasMatrixRow(role, row)));
  return { roles: MATRIX_ROLES, rows, cells };
}
