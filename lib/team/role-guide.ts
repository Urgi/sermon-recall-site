import {
  hasPermission,
  INVITABLE_STAFF_ROLES,
  STAFF_ROLE_RANK,
  type Permission,
  type StaffRole,
} from '@/lib/auth/permissions';

import { getActiveUiLanguage, tr, type UiKey } from '@/lib/i18n/ui';

/** Builds a Record whose values are translated at read time, so call sites keep plain lookups. */
function localizedRecord<K extends string>(keys: readonly K[], keyFor: (k: K) => UiKey): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const k of keys) {
    Object.defineProperty(out, k, { enumerable: true, get: () => tr(keyFor(k)) });
  }
  return out;
}

const STAFF_ROLES = ['owner', 'admin_pastor', 'associate_pastor', 'elder', 'contributor', 'viewer'] as const;

export const ROLE_LABELS: Record<StaffRole, string> = localizedRecord(
  STAFF_ROLES,
  (r) => `role.${r}` as UiKey,
);

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = localizedRecord(
  STAFF_ROLES,
  (r) => `roledesc.${r}` as UiKey,
);

const PERMISSION_LABELS: Record<Permission, string> = localizedRecord(
  [
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
    'can_manage_billing',
  ] as const,
  (p) => `perm.${p}` as UiKey,
);

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
  'can_manage_billing',
];

export function permissionsForRole(role: StaffRole): Permission[] {
  return ALL_PERMISSIONS.filter((p) => hasPermission(role, p));
}

export function permissionSummary(role: StaffRole): string[] {
  return permissionsForRole(role).map((p) => PERMISSION_LABELS[p]);
}

const KNOWN_STATUSES = new Set([
  'active',
  'pending',
  'pending_invite',
  'accepted_pending_approval',
  'removed',
  'suspended',
]);

export function statusLabel(status: string): string {
  return KNOWN_STATUSES.has(status) ? tr(`team.status.${status}` as UiKey) : status.replace(/_/g, ' ');
}

export function formatTeamDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(getActiveUiLanguage(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
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
