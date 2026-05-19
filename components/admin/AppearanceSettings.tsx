'use client';

import { useAdminTheme } from '@/components/admin/ThemeProvider';
import type { AdminThemePreference } from '@/lib/theme/admin-theme';

const OPTIONS: { value: AdminThemePreference; label: string; description: string }[] = [
  {
    value: 'dark',
    label: 'Dark',
    description: 'Deep slate background (default for admin).',
  },
  {
    value: 'light',
    label: 'Bright',
    description: 'Light background with higher contrast for daytime use.',
  },
  {
    value: 'system',
    label: 'System',
    description: 'Match your device appearance setting.',
  },
];

export function AppearanceSettings() {
  const { preference, resolved, setPreference } = useAdminTheme();

  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-relaxed text-admin-muted">
        Currently using <span className="font-medium text-admin-fg">{resolved}</span> mode on this
        device.
      </p>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((opt) => {
          const selected = preference === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer gap-3 rounded-lg border px-4 py-3 transition-colors ${
                selected
                  ? 'border-sky-500/50 bg-sky-500/10'
                  : 'border-admin bg-admin-card hover:border-admin-strong'
              }`}
            >
              <input
                type="radio"
                name="admin-theme"
                checked={selected}
                onChange={() => setPreference(opt.value)}
                className="mt-1 border-admin-strong text-sky-500"
              />
              <span>
                <span className="block text-[15px] font-medium text-admin-fg">{opt.label}</span>
                <span className="mt-0.5 block text-[13px] text-admin-muted">{opt.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
