export type AdminThemePreference = 'dark' | 'light' | 'system';

export const ADMIN_THEME_STORAGE_KEY = 'sermon-recall-admin-theme';

export function resolveAdminTheme(
  preference: AdminThemePreference,
  systemPrefersLight: boolean,
): 'dark' | 'light' {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemPrefersLight ? 'light' : 'dark';
}

export function readStoredAdminThemePreference(): AdminThemePreference {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function storeAdminThemePreference(preference: AdminThemePreference): void {
  try {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}
