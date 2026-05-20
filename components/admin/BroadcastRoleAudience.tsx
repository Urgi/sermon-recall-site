'use client';

import type { StaffRole } from '@/lib/auth/permissions';
import { BROADCAST_TEAM_ROLES } from '@/lib/push/broadcast-audience';

type Props = {
  selected: StaffRole[];
  includeAllMembers: boolean;
  onSelectedChange: (roles: StaffRole[]) => void;
  onIncludeAllMembersChange: (value: boolean) => void;
  disabled?: boolean;
};

export function BroadcastRoleAudience({
  selected,
  includeAllMembers,
  onSelectedChange,
  onIncludeAllMembersChange,
  disabled,
}: Props) {
  function toggle(role: StaffRole) {
    if (disabled) return;
    if (selected.includes(role)) {
      onSelectedChange(selected.filter((r) => r !== role));
    } else {
      onSelectedChange([...selected, role]);
    }
  }

  return (
    <div className="space-y-3">
      <p className="admin-label">Team roles</p>
      <p className="admin-hint text-[13px]">
        Tick who should receive this notification. They must open it in the app to see the full
        message; you can track who opened it below.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {BROADCAST_TEAM_ROLES.map(({ role, label }) => (
          <label
            key={role}
            className="flex cursor-pointer items-center gap-2 text-[14px] text-admin-fg-secondary"
          >
            <input
              type="checkbox"
              checked={selected.includes(role)}
              onChange={() => toggle(role)}
              disabled={disabled}
              className="h-4 w-4 rounded border-admin accent-[#0ea5e9]"
            />
            {label}
          </label>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[14px] text-admin-fg-secondary">
        <input
          type="checkbox"
          checked={includeAllMembers}
          onChange={(e) => onIncludeAllMembersChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-admin accent-[#0ea5e9]"
        />
        All church members (app users with push)
      </label>
    </div>
  );
}
