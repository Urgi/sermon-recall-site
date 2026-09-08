'use client';

import { useAdminTheme } from '@/components/admin/ThemeProvider';
import type { AdminThemePreference } from '@/lib/theme/admin-theme';

const OPTIONS: {
  value: AdminThemePreference;
  label: string;
  description: string;
  swatch: string;
}[] = [
  {
    value: 'dark',
    label: 'Dark',
    description: 'Deep slate background.',
    swatch: 'bg-[#05070a]',
  },
  {
    value: 'light',
    label: 'Bright',
    description: 'Higher contrast for daytime.',
    swatch: 'bg-[#f8fafc]',
  },
  {
    value: 'system',
    label: 'System',
    description: 'Match this device.',
    swatch: 'bg-[linear-gradient(90deg,#05070a_50%,#f8fafc_50%)]',
  },
];

export function AppearanceSettings() {
  const { preference, resolved, setPreference } = useAdminTheme();

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-[var(--admin-muted)]">
        Currently using <span className="font-semibold text-[var(--admin-fg-strong)]">{resolved}</span>{' '}
        mode.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const selected = preference === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-3.5 transition-colors ${
                selected
                  ? 'border-[#0ea5e9] bg-sky-500/10'
                  : 'border-[var(--admin-border-strong)] hover:border-[var(--admin-accent)]'
              }`}
            >
              <span className={`h-10 w-full rounded-lg border border-[var(--admin-border)] ${opt.swatch}`} />
              <span className="flex gap-2.5">
                <input
                  type="radio"
                  name="admin-theme"
                  checked={selected}
                  onChange={() => setPreference(opt.value)}
                  className="mt-1 border-admin-strong text-sky-500"
                />
                <span>
                  <span className="block text-[14px] font-semibold text-[var(--admin-fg-strong)]">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-[var(--admin-muted)]">
                    {opt.description}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
