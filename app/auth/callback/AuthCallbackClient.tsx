'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Legacy email links land here. Signup and password reset both use in-app OTP codes now.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  // If the redirect stalls (slow network, blocked storage), offer a way out instead of a spinner forever.
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 6000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const supabase = createBrowserSupabaseClient();
      const next = searchParams.get('next');
      const type = searchParams.get('type');
      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const hash =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
          : new URLSearchParams();
      const hasImplicitTokens = Boolean(hash.get('access_token') && hash.get('refresh_token'));
      const hasLinkParams =
        Boolean(code || tokenHash || hasImplicitTokens) ||
        type === 'signup' ||
        type === 'email' ||
        type === 'recovery';

      if (hasLinkParams) {
        await supabase.auth.signOut();
        if (cancelled) return;
        const isRecovery = next === 'reset-password' || type === 'recovery';
        router.replace(isRecovery ? '/login?error=use_code' : '/verify-email?error=use_code');
        return;
      }

      if (!cancelled) {
        router.replace('/login');
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--admin-page-bg,#05070a)] px-6">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400"
        aria-hidden
      />
      <p className="text-center text-[15px] text-[#94a3b8]" role="status">
        {t('callback.redirecting')}
      </p>
      {slow ? (
        <Link href="/login" className="inline-flex min-h-10 items-center text-[14px] font-semibold text-[#38bdf8] hover:underline">
          {t('callback.slow')}
        </Link>
      ) : null}
    </div>
  );
}
