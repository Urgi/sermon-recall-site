import type { StaffRole } from '@/lib/auth/permissions';

/** Roles pastors can target for team notifications (matches church_memberships.role). */
export const BROADCAST_TEAM_ROLES: { role: StaffRole; label: string }[] = [
  { role: 'owner', label: 'Owner' },
  { role: 'admin_pastor', label: 'Admin pastor' },
  { role: 'associate_pastor', label: 'Associate pastor' },
  { role: 'elder', label: 'Elder' },
  { role: 'contributor', label: 'Contributor' },
  { role: 'viewer', label: 'Viewer' },
];

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
