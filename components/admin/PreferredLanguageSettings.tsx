'use client';

import { useEffect, useState } from 'react';

import {
  APP_LANGUAGES,
  DEFAULT_APP_LANGUAGE,
  type AppLanguage,
  languageOptionLabel,
  normalizeAppLanguage,
} from '@/lib/i18n/languages';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function PreferredLanguageSettings() {
  const [language, setLanguage] = useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('preferred_language')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) {
        setLanguage(normalizeAppLanguage(data?.preferred_language));
        setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Sign in again to update language.');
        return;
      }
      const { error: updateError } = await supabase
        .from('users')
        .update({ preferred_language: language })
        .eq('id', user.id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess('Language preference saved.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <p className="text-[14px] text-admin-muted">Loading…</p>;
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div>
        <label htmlFor="preferred-language" className="admin-label">
          Preferred language
        </label>
        <select
          id="preferred-language"
          value={language}
          onChange={(e) => setLanguage(normalizeAppLanguage(e.target.value))}
          className="admin-input mt-1"
        >
          {APP_LANGUAGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {languageOptionLabel(opt.value)}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="text-[13px] text-red-500" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-[13px] text-emerald-600 dark:text-emerald-400" role="status">
          {success}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="admin-btn-primary disabled:opacity-60">
        {pending ? 'Saving…' : 'Save language'}
      </button>
    </form>
  );
}
