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
  type AppLanguage,
  normalizeAppLanguage,
} from '@/lib/i18n/languages';
import { translateUi, type UiKey, type UiVars } from '@/lib/i18n/ui';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: UiKey, vars?: UiVars) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage?: string | null;
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(
    normalizeAppLanguage(initialLanguage ?? DEFAULT_APP_LANGUAGE),
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (initialLanguage) {
      setLanguageState(normalizeAppLanguage(initialLanguage));
      return;
    }
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
          setLanguageState(normalizeAppLanguage(data.preferred_language));
        }
      } catch {
        // Keep default language if session is not ready.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialLanguage]);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(normalizeAppLanguage(next));
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
