'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ToastCard } from '@/components/ToastCard';
import { consumePendingAppToast, type PendingAppToast } from '@/lib/app-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type VisibleToast = PendingAppToast & { id: number };

import {
  signupCodeSentMessage,
  codeNotLinkMessage,
  resetCodeNotLinkMessage,
} from '@/lib/auth/signup-email-messages';
import { tr } from '@/lib/i18n/ui';

const AUTO_DISMISS_MS = 9000;

function toastFromAuthQuery(searchParams: URLSearchParams): PendingAppToast | null {
  if (searchParams.get('email_sent') === '1') {
    return { message: signupCodeSentMessage(), variant: 'success' };
  }
  if (searchParams.get('welcome') === '1') {
    return { message: tr('toast.welcome'), variant: 'success' };
  }
  if (searchParams.get('confirmed') === '1') {
    if (searchParams.get('already_used') === '1') {
      return {
        message: tr('toast.alreadyUsed'),
        variant: 'success',
      };
    }
    return { message: tr('toast.confirmed'), variant: 'success' };
  }
  const error = searchParams.get('error');
  if (error === 'missing_auth_code') {
    return {
      message: tr('toast.openVerify'),
      variant: 'error',
      href: '/verify-email',
      hrefLabel: tr('toast.enterConfirmCode'),
    };
  }
  if (error === 'confirmation_failed' || error === 'use_code') {
    return {
      message: codeNotLinkMessage(),
      variant: 'error',
      href: '/verify-email',
      hrefLabel: tr('toast.enterConfirmCode'),
    };
  }
  if (error === 'reset_use_code') {
    return {
      message: resetCodeNotLinkMessage(),
      variant: 'error',
      href: '/login',
      hrefLabel: tr('reg.signInWithCode'),
    };
  }
  if (searchParams.get('setup') === 'failed') {
    return {
      message: tr('toast.setupFailed'),
      variant: 'error',
    };
  }
  if (error === 'server_config') {
    return {
      message: tr('toast.serverConfig'),
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
    // Wait one tick so the language provider has applied the remembered language first.
    const id = window.setTimeout(() => {
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
    }, 0);
    return () => window.clearTimeout(id);
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

  const removeToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="app-toast-stack pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          href={toast.href}
          hrefLabel={toast.hrefLabel}
          autoDismissMs={toast.variant === 'error' || toast.href ? AUTO_DISMISS_MS : 6000}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
