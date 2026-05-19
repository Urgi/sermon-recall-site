'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type AdminThemePreference,
  readStoredAdminThemePreference,
  resolveAdminTheme,
  storeAdminThemePreference,
} from '@/lib/theme/admin-theme';

type ResolvedTheme = 'dark' | 'light';

type ThemeContextValue = {
  preference: AdminThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: AdminThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<AdminThemePreference>('dark');
  const [systemPrefersLight, setSystemPrefersLight] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPreferenceState(readStoredAdminThemePreference());
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    setSystemPrefersLight(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersLight(e.matches);
    mq.addEventListener('change', onChange);
    setReady(true);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = useMemo(
    () => resolveAdminTheme(preference, systemPrefersLight),
    [preference, systemPrefersLight],
  );

  useEffect(() => {
    if (!ready) return;
    applyResolvedTheme(resolved);
  }, [ready, resolved]);

  const setPreference = useCallback((next: AdminThemePreference) => {
    storeAdminThemePreference(next);
    setPreferenceState(next);
    const prefersLight =
      next === 'light' ||
      (next === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
    applyResolvedTheme(resolveAdminTheme(next, prefersLight));
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAdminTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAdminTheme must be used within ThemeProvider');
  }
  return ctx;
}
