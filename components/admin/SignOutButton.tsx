'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    setPending(false);
    router.refresh();
    router.push('/login');
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={pending}
      className={
        className ??
        'w-full rounded-md px-2 py-2 text-left text-[14px] text-admin-muted transition-colors duration-fast hover:bg-admin-nav-hover hover:text-admin-accent disabled:opacity-50'
      }
    >
      {pending ? t('common.signingOut') : t('common.signOut')}
    </button>
  );
}
