'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  APP_LANGUAGES,
  DEFAULT_APP_LANGUAGE,
  type AppLanguage,
  languageOptionLabel,
} from '@/lib/i18n/languages';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function CreateChurchForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [churchCode, setChurchCode] = useState('');
  const [pastorName, setPastorName] = useState('');
  const [sermonLanguage, setSermonLanguage] = useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error: rpcError } = await supabase.rpc('create_church', {
      p_name: name.trim(),
      p_church_code: churchCode.trim(),
      p_pastor_display_name: pastorName.trim() || null,
      p_sermon_language: sermonLanguage,
    });
    setPending(false);
    if (rpcError) {
      const msg = rpcError.message;
      if (msg.includes('already_in_church')) {
        setError(t('cc.err.already'));
      } else if (msg.includes('invalid_church_code_format')) {
        setError(t('cc.err.codeFormat'));
      } else if (msg.includes('invalid_name')) {
        setError(t('cc.err.name'));
      } else if (msg.includes('invalid_sermon_language')) {
        setError(t('cc.err.lang'));
      } else if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        setError(t('cc.err.taken'));
      } else if (msg.includes('cannot_change_role') || msg.includes('cannot_change_church_id')) {
        setError(t('cc.err.setup'));
      } else {
        setError(msg);
      }
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="church-name" className="block text-[13px] font-medium text-[#94a3b8]">
          {t('cc.name')}
        </label>
        <input
          id="church-name"
          name="name"
          type="text"
          required
          autoComplete="organization"
          placeholder="Grace Community Church"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 transition-[border-color,box-shadow] duration-fast placeholder:text-[#64748b] focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="new-church-code" className="block text-[13px] font-medium text-[#94a3b8]">
          {t('share.churchCode')}
        </label>
        <p className="mt-0.5 text-[12px] leading-snug text-[#64748b]">
          {t('cc.codeHint')}
        </p>
        <input
          id="new-church-code"
          name="churchCode"
          type="text"
          autoComplete="off"
          required
          minLength={4}
          maxLength={32}
          placeholder="GRACE001"
          value={churchCode}
          onChange={(e) => setChurchCode(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 font-mono text-[15px] uppercase text-white outline-none ring-sky-400/40 transition-[border-color,box-shadow] duration-fast placeholder:text-[#64748b] focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="pastor-display-name" className="block text-[13px] font-medium text-[#94a3b8]">
          {t('cc.pastor')}
        </label>
        <input
          id="pastor-display-name"
          name="pastorName"
          type="text"
          autoComplete="name"
          placeholder={t('cc.pastorPlaceholder')}
          value={pastorName}
          onChange={(e) => setPastorName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 transition-[border-color,box-shadow] duration-fast placeholder:text-[#64748b] focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="sermon-language" className="block text-[13px] font-medium text-[#94a3b8]">
          {t('settings.churchLanguage')}
        </label>
        <p className="mt-0.5 text-[12px] leading-snug text-[#64748b]">
          {t('cc.langHint')}
        </p>
        <select
          id="sermon-language"
          name="sermonLanguage"
          value={sermonLanguage}
          onChange={(e) => setSermonLanguage(e.target.value as AppLanguage)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 transition-[border-color,box-shadow] duration-fast placeholder:text-[#64748b] focus:border-[#38bdf8] focus:ring-2"
        >
          {APP_LANGUAGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {languageOptionLabel(opt.value)}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#0379bd] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#0369a1] disabled:opacity-60"
      >
        {pending ? t('cc.creating') : t('cc.submit')}
      </button>
    </form>
  );
}
