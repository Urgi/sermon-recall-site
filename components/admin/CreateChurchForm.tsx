'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  APP_LANGUAGES,
  DEFAULT_APP_LANGUAGE,
  type AppLanguage,
  languageOptionLabel,
} from '@/lib/i18n/languages';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function CreateChurchForm() {
  const router = useRouter();
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
        setError('You already belong to a church. Leave or use another account to create one.');
      } else if (msg.includes('invalid_church_code_format')) {
        setError('Church code must be 4–32 characters after trimming.');
      } else if (msg.includes('invalid_name')) {
        setError('Enter a church name.');
      } else if (msg.includes('invalid_sermon_language')) {
        setError('Choose English, Spanish, or French for church language.');
      } else if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        setError('That church code is already taken. Pick another.');
      } else if (msg.includes('cannot_change_role') || msg.includes('cannot_change_church_id')) {
        setError(
          'Could not finish setup. Sign out, sign in again, and try once more. If it persists, contact support.',
        );
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
          Church name
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
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="new-church-code" className="block text-[13px] font-medium text-[#94a3b8]">
          Church code
        </label>
        <p className="mt-0.5 text-[12px] leading-snug text-[#64748b]">
          Members use this code in the app to join. Letters and numbers; stored uppercase (e.g.{' '}
          <span className="font-mono text-[#94a3b8]">GRACE001</span>).
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
          className="mt-1 w-full max-w-xs rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 font-mono text-[15px] uppercase text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="pastor-display-name" className="block text-[13px] font-medium text-[#94a3b8]">
          Lead pastor (optional)
        </label>
        <input
          id="pastor-display-name"
          name="pastorName"
          type="text"
          autoComplete="name"
          placeholder="Shown on church profile"
          value={pastorName}
          onChange={(e) => setPastorName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="sermon-language" className="block text-[13px] font-medium text-[#94a3b8]">
          Church language
        </label>
        <p className="mt-0.5 text-[12px] leading-snug text-[#64748b]">
          Language for sermons and devotionals shared with your congregation. Change later in
          settings.
        </p>
        <select
          id="sermon-language"
          name="sermonLanguage"
          value={sermonLanguage}
          onChange={(e) => setSermonLanguage(e.target.value as AppLanguage)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
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
        className="rounded-lg bg-[#0ea5e9] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create church'}
      </button>
    </form>
  );
}
