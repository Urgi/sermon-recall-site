import type { StaffRole } from '@/lib/auth/permissions';
import { tr, type UiKey } from '@/lib/i18n/ui';

/** Roles pastors can target for team notifications (matches church_memberships.role). */
const BROADCAST_ROLES: StaffRole[] = [
  'owner',
  'admin_pastor',
  'associate_pastor',
  'elder',
  'contributor',
  'viewer',
];

/** Labels are translated when read, in the language of the signed-in user. */
export const BROADCAST_TEAM_ROLES: { role: StaffRole; label: string }[] = BROADCAST_ROLES.map((role) => ({
  role,
  get label() {
    return tr(`role.${role}` as UiKey);
  },
}));

const VALID_STAFF_ROLES = new Set<string>(BROADCAST_TEAM_ROLES.map((r) => r.role));

export function parseTargetStaffRoles(input: unknown): StaffRole[] {
  if (!Array.isArray(input)) return [];
  const out: StaffRole[] = [];
  for (const v of input) {
    if (typeof v === 'string' && VALID_STAFF_ROLES.has(v)) {
      out.push(v as StaffRole);
    }
  }
  return Array.from(new Set(out));
}

export function formatTargetStaffRoles(roles: StaffRole[] | null | undefined): string {
  if (!roles?.length) return '—';
  return roles
    .map((r) => BROADCAST_TEAM_ROLES.find((x) => x.role === r)?.label ?? r.replace(/_/g, ' '))
    .join(', ');
}
