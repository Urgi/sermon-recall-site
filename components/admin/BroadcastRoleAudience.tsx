'use client';

import { useLanguage } from '@/components/i18n/LanguageProvider';
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
  const { t } = useLanguage();

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
      <p className="admin-label">{t('notify.rolesTitle')}</p>
      <p className="admin-hint text-[13px]">
        {t('notify.rolesHint')}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {BROADCAST_TEAM_ROLES.map(({ role, label }) => (
          <label
            key={role}
            className="flex min-h-8 cursor-pointer items-center gap-2 text-[14px] text-admin-fg-secondary"
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
      <label className="flex min-h-8 cursor-pointer items-center gap-2 text-[14px] text-admin-fg-secondary">
        <input
          type="checkbox"
          checked={includeAllMembers}
          onChange={(e) => onIncludeAllMembersChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-admin accent-[#0ea5e9]"
        />
        {t('notify.allMembers')}
      </label>
    </div>
  );
}
