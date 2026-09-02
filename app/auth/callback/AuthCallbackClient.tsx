'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Legacy email links land here. Signup and password reset both use in-app OTP codes now.
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      <p className="text-center text-[15px] text-[#94a3b8]">Redirecting…</p>
    </div>
  );
}
