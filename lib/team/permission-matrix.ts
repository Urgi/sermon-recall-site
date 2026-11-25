import { tr, type UiKey } from '@/lib/i18n/ui';
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
    get label() {
      return tr('pm.invite_users' as UiKey);
    },
    permissions: ['can_invite_users'],
    get tooltip() {
      return tr('pm.invite_users.tip' as UiKey);
    },
  },
  {
    id: 'approve_users',
    get label() {
      return tr('pm.approve_users' as UiKey);
    },
    permissions: ['can_approve_users'],
    get tooltip() {
      return tr('pm.approve_users.tip' as UiKey);
    },
  },
  {
    id: 'manage_team',
    get label() {
      return tr('pm.manage_team' as UiKey);
    },
    permissions: ['can_manage_team'],
    get tooltip() {
      return tr('pm.manage_team.tip' as UiKey);
    },
  },
  {
    id: 'remove_team',
    get label() {
      return tr('pm.remove_team' as UiKey);
    },
    permissions: ['can_manage_team'],
    get tooltip() {
      return tr('pm.remove_team.tip' as UiKey);
    },
  },
  {
    id: 'generate_devotionals',
    get label() {
      return tr('pm.generate_devotionals' as UiKey);
    },
    permissions: ['can_generate_devotionals'],
    get tooltip() {
      return tr('pm.generate_devotionals.tip' as UiKey);
    },
  },
  {
    id: 'edit_devotionals',
    get label() {
      return tr('pm.edit_devotionals' as UiKey);
    },
    permissions: ['can_edit_devotionals'],
    get tooltip() {
      return tr('pm.edit_devotionals.tip' as UiKey);
    },
  },
  {
    id: 'submit_for_approval',
    get label() {
      return tr('pm.submit_for_approval' as UiKey);
    },
    permissions: ['can_submit_for_approval'],
    get tooltip() {
      return tr('pm.submit_for_approval.tip' as UiKey);
    },
  },
  {
    id: 'approve_devotionals',
    get label() {
      return tr('pm.approve_devotionals' as UiKey);
    },
    permissions: ['can_approve_devotionals'],
    get tooltip() {
      return tr('pm.approve_devotionals.tip' as UiKey);
    },
  },
  {
    id: 'publish_devotionals',
    get label() {
      return tr('pm.publish_devotionals' as UiKey);
    },
    permissions: ['can_publish_devotionals'],
    get tooltip() {
      return tr('pm.publish_devotionals.tip' as UiKey);
    },
  },
  {
    id: 'send_notifications',
    get label() {
      return tr('pm.send_notifications' as UiKey);
    },
    permissions: ['can_send_notifications'],
    get tooltip() {
      return tr('pm.send_notifications.tip' as UiKey);
    },
  },
  {
    id: 'manage_church_settings',
    get label() {
      return tr('pm.manage_church_settings' as UiKey);
    },
    permissions: ['can_manage_church_settings'],
    get tooltip() {
      return tr('pm.manage_church_settings.tip' as UiKey);
    },
  },
  {
    id: 'view_analytics',
    get label() {
      return tr('pm.view_analytics' as UiKey);
    },
    permissions: ['can_generate_devotionals'],
    get tooltip() {
      return tr('pm.view_analytics.tip' as UiKey);
    },
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
