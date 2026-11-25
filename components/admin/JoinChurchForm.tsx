'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function JoinChurchForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error: rpcError } = await supabase.rpc('join_church', {
      p_code: code.trim(),
    });
    setPending(false);
    if (rpcError) {
      if (rpcError.message.includes('invalid_church_code')) {
        setError(t('join.notFound'));
      } else if (rpcError.message.includes('church_member_limit_reached')) {
        setError(t('join.full'));
      } else {
        setError(rpcError.message);
      }
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label htmlFor="church-code" className="block text-[13px] font-medium text-[#94a3b8]">
          {t('share.churchCode')}
        </label>
        <input
          id="church-code"
          name="code"
          type="text"
          autoComplete="off"
          placeholder={t('join.placeholder')}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 font-mono text-[15px] uppercase text-white outline-none ring-sky-400/40 transition-[border-color,box-shadow] duration-fast placeholder:text-[#64748b] focus:border-[#38bdf8] focus:ring-2"
        />
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
        {pending ? t('join.joining') : t('join.submit')}
      </button>
    </form>
  );
}
