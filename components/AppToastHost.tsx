'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { consumePendingAppToast, type PendingAppToast } from '@/lib/app-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type VisibleToast = PendingAppToast & { id: number };

const AUTO_DISMISS_MS = 9000;

const EMAIL_SENT_MESSAGE =
  'We sent a confirmation link to your email. Open it on this device, then sign in. Check spam if nothing arrives in a few minutes.';

const CONFIRMED_MESSAGE =
  'Your email is confirmed! Sign in below, or we will take you to your dashboard if you are already signed in.';

const WELCOME_MESSAGE =
  'Welcome! Create your church on the dashboard to get started.';

function toastFromAuthQuery(searchParams: URLSearchParams): PendingAppToast | null {
  if (searchParams.get('email_sent') === '1') {
    return { message: EMAIL_SENT_MESSAGE, variant: 'success' };
  }
  if (searchParams.get('welcome') === '1') {
    return { message: WELCOME_MESSAGE, variant: 'success' };
  }
  if (searchParams.get('confirmed') === '1') {
    if (searchParams.get('already_used') === '1') {
      return {
        message:
          'This confirmation link was already used. You are confirmed — sign in below or continue to your dashboard.',
        variant: 'success',
      };
    }
    return { message: CONFIRMED_MESSAGE, variant: 'success' };
  }
  const error = searchParams.get('error');
  if (error === 'missing_auth_code') {
    return {
      message:
        'This confirmation link is incomplete. Open the full link from your email again (try a different browser if it keeps failing).',
      variant: 'error',
    };
  }
  if (error === 'confirmation_failed') {
    return {
      message:
        'Email confirmation failed. The link may have expired — sign in with your password or register again.',
      variant: 'error',
    };
  }
  if (searchParams.get('setup') === 'failed') {
    return {
      message:
        'Your account could not be set up. Sign out, try again, or contact support if this continues.',
      variant: 'error',
    };
  }
  if (error === 'server_config') {
    return {
      message: 'Sign-in is temporarily unavailable. Please try again later.',
      variant: 'error',
    };
  }
  return null;
}

export function AppToastHost() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryHandled = useRef(false);
  const [toasts, setToasts] = useState<VisibleToast[]>([]);

  const pushToast = useCallback((toast: PendingAppToast) => {
    setToasts((t) => [...t, { ...toast, id: Date.now() + Math.random() }]);
  }, []);

  useEffect(() => {
    if (queryHandled.current) return;
    const params = new URLSearchParams(searchParams.toString());
    const queryToast = toastFromAuthQuery(params);
    if (queryToast) {
      queryHandled.current = true;
      pushToast(queryToast);
      return;
    }
    const pending = consumePendingAppToast();
    if (pending) {
      queryHandled.current = true;
      pushToast(pending);
    }
  }, [searchParams, pushToast]);

  useEffect(() => {
    if (searchParams.get('confirmed') !== '1') return;
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;
    let timeoutId: number | undefined;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) return;
      timeoutId = window.setTimeout(() => {
        router.replace('/dashboard');
      }, 2800);
    });
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [searchParams, router]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const id = window.setTimeout(() => {
      setToasts((t) => t.slice(1));
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="app-toast-stack pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`app-toast-enter pointer-events-auto flex w-full max-w-md flex-col gap-2 rounded-xl border px-4 py-3 shadow-lg ${
            toast.variant === 'error'
              ? 'border-red-500/40 bg-red-950 text-red-50'
              : 'border-emerald-500/40 bg-emerald-950 text-emerald-50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[14px] leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToasts((t) => t.filter((x) => x.id !== toast.id))}
              className="shrink-0 text-[18px] leading-none opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          {toast.href ? (
            <Link
              href={toast.href}
              className="text-[13px] font-medium text-sky-300 hover:text-sky-200 hover:underline"
            >
              {toast.hrefLabel ?? 'View'}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
