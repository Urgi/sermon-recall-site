'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { ensurePublicUserProfile } from '@/lib/auth/ensure-public-profile';
import { queueAppToast } from '@/lib/app-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const CONFIRMED_MESSAGE =
  'Your email is confirmed. Taking you to your dashboard…';

/**
 * Browser-only auth callback (email confirm, magic links).
 * Handles ?code=, ?token_hash=, and #access_token= (common in mobile mail apps).
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const supabase = createBrowserSupabaseClient();
      const next = searchParams.get('next');
      const safeNext =
        next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      let exchangeError: string | null = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) exchangeError = error.message;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email' | 'recovery' | 'email_change',
        });
        if (error) exchangeError = error.message;
      } else {
        const hash = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '',
        );
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) exchangeError = error.message;
        } else {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            if (!cancelled) {
              router.replace('/login?error=missing_auth_code');
            }
            return;
          }
        }
      }

      if (cancelled) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (exchangeError) {
        const msg = exchangeError.toLowerCase();
        if (session) {
          if (msg.includes('already been used') || msg.includes('expired')) {
            queueAppToast({
              variant: 'success',
              message:
                'This link was already used. You are signed in — continuing to your dashboard.',
            });
          } else {
            queueAppToast({ variant: 'success', message: CONFIRMED_MESSAGE });
          }
        } else if (msg.includes('already been used') || msg.includes('expired')) {
          router.replace('/login?confirmed=1&already_used=1');
          return;
        } else {
          router.replace('/login?error=confirmation_failed');
          return;
        }
      }

      if (!session?.user) {
        router.replace('/login?error=confirmation_failed');
        return;
      }

      if (safeNext.includes('reset-password')) {
        router.replace('/reset-password');
        return;
      }

      const profileResult = await ensurePublicUserProfile(supabase, session.user);
      if (!profileResult.ok) {
        console.warn('[auth/callback] profile ensure failed:', profileResult.error);
        router.replace('/login?setup=failed');
        return;
      }

      queueAppToast({ variant: 'success', message: CONFIRMED_MESSAGE });
      router.replace('/dashboard?welcome=1');
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
      <p className="text-center text-[15px] text-[#94a3b8]">Finishing sign-in…</p>
    </div>
  );
}
