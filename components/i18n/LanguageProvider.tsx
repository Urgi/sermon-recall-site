'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_APP_LANGUAGE,
  LANGUAGE_COOKIE,
  type AppLanguage,
  normalizeAppLanguage,
} from '@/lib/i18n/languages';
import { setActiveUiLanguage, translateUi, type UiKey, type UiVars } from '@/lib/i18n/ui';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: UiKey, vars?: UiVars) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Remember the language in a cookie so the server can render the right language on the next request. */
function rememberLanguage(language: AppLanguage): void {
  try {
    document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Cookies blocked: the language still applies for this visit.
  }
}

/** Language remembered in the cookie, read in the browser (for statically rendered pages). */
function rememberedLanguage(): AppLanguage | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE}=([^;]*)`));
    const value = match?.[1]?.toLowerCase();
    return value === 'en' || value === 'es' || value === 'fr' ? value : null;
  } catch {
    return null;
  }
}

/** First supported language in the browser's preference list, if any. */
function browserLanguage(): AppLanguage | null {
  const list = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  for (const tag of list) {
    const base = tag?.slice(0, 2).toLowerCase();
    if (base === 'es' || base === 'fr' || base === 'en') return base;
  }
  return null;
}

export function LanguageProvider({
  initialLanguage,
  detectBrowserLanguage = false,
  children,
}: {
  /** Language remembered in the cookie (read on the server), so server and client render the same text. */
  initialLanguage?: string | null;
  /** For signed-out screens: with nothing remembered yet, follow the browser's language. */
  detectBrowserLanguage?: boolean;
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(
    normalizeAppLanguage(initialLanguage ?? DEFAULT_APP_LANGUAGE),
  );

  setActiveUiLanguage(language);

  // The root provider (no initialLanguage, no detection) leaves <html lang> alone, so the nested
  // admin/auth/public providers, which run their effects first, are not overwritten by it.
  useEffect(() => {
    if (initialLanguage === undefined && !detectBrowserLanguage) return;
    document.documentElement.lang = language;
  }, [language, initialLanguage, detectBrowserLanguage]);

  // Nothing passed from the server: a language chosen earlier on this device wins, then the
  // browser's own preference. Static pages render English first, then switch after hydration.
  useEffect(() => {
    if (!detectBrowserLanguage || initialLanguage) return;
    const detected = rememberedLanguage() ?? browserLanguage();
    if (detected) setLanguageState(detected);
  }, [detectBrowserLanguage, initialLanguage]);

  // Signed-in users: their saved preference wins.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('users')
          .select('preferred_language')
          .eq('id', user.id)
          .maybeSingle();
        if (!cancelled && data?.preferred_language) {
          const preferred = normalizeAppLanguage(data.preferred_language);
          setLanguageState(preferred);
          rememberLanguage(preferred);
        }
      } catch {
        // Keep the current language if the session is not ready.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    const normalized = normalizeAppLanguage(next);
    setLanguageState(normalized);
    rememberLanguage(normalized);
  }, []);

  const t = useCallback(
    (key: UiKey, vars?: UiVars) => translateUi(language, key, vars),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: DEFAULT_APP_LANGUAGE,
      setLanguage: () => undefined,
      t: (key, vars) => translateUi(DEFAULT_APP_LANGUAGE, key, vars),
    };
  }
  return ctx;
}
