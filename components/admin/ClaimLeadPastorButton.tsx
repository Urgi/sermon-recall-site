'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function ClaimLeadPastorButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setError(null);
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error: rpcError } = await supabase.rpc('claim_lead_pastor_if_vacant');
    setPending(false);
    if (rpcError) {
      if (rpcError.message.includes('pastor_already_exists')) {
        setError(t('dash.claimErrExists'));
      } else if (rpcError.message.includes('no_church')) {
        setError(t('dash.claimErrJoin'));
      } else {
        setError(t('common.error'));
      }
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void claim()}
        disabled={pending}
        className="admin-btn-primary"
      >
        {pending ? t('dash.claimUpdating') : t('dash.claimButton')}
      </button>
      <p className="text-[12px] leading-relaxed text-sky-900/80 dark:text-sky-100/75">
        {t('dash.claimWarn')}
      </p>
      {error ? (
        <p className="text-[13px] text-red-600 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
