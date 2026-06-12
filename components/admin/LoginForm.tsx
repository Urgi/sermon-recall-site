'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { mapAuthError } from '@/lib/auth/mapAuthError';
import { USE_CODE_NOT_LINK_MESSAGE } from '@/lib/auth/signup-email-messages';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = {
  nextPath: string;
  initialEmail?: string;
  linkRejected?: boolean;
};

export function LoginForm({ nextPath, initialEmail = '', linkRejected = false }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.refresh();
        router.replace(nextPath);
      }
    });
  }, [router, nextPath]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendNotice(null);
    setShowResend(false);
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        const msg = signError.message.toLowerCase();
        setError(mapAuthError(signError.message));
        if (msg.includes('not confirmed') || msg.includes('confirm')) {
          setShowResend(true);
        }
        return;
      }
      router.refresh();
      router.push(nextPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(mapAuthError(msg));
    } finally {
      setPending(false);
    }
  }

  async function onResendConfirmation() {
    if (!email.trim()) {
      setResendNotice('Enter your email above, then try again.');
      return;
    }
    setResendPending(true);
    setResendNotice(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (resendError) {
        setResendNotice(mapAuthError(resendError.message));
        return;
      }
      setResendNotice('Confirmation code sent. Check inbox and spam.');
    } catch {
      setResendNotice('Network error. Check your connection and try again.');
    } finally {
      setResendPending(false);
    }
  }

  const verifyHref = email.trim()
    ? `/verify-email?email=${encodeURIComponent(email.trim())}`
    : '/verify-email';

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {linkRejected ? (
        <p className="rounded-lg border border-red-500/35 bg-red-950/40 px-3 py-2 text-[13px] leading-relaxed text-red-100" role="alert">
          {USE_CODE_NOT_LINK_MESSAGE}
        </p>
      ) : null}

      <div>
        <label htmlFor="login-email" className="block text-[13px] font-medium text-[#94a3b8]">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2 disabled:opacity-60"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="block text-[13px] font-medium text-[#94a3b8]">
            Password
          </label>
          <Link href="/forgot-password" className="text-[12px] text-[#38bdf8] hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          required
          disabled={pending}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {showResend ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={resendPending || pending}
            onClick={() => void onResendConfirmation()}
            className="text-left text-[13px] font-medium text-[#38bdf8] hover:underline disabled:opacity-60"
          >
            {resendPending ? 'Sending…' : 'Resend confirmation code'}
          </button>
          <Link href={verifyHref} className="text-[13px] font-medium text-[#38bdf8] hover:underline">
            Enter confirmation code
          </Link>
        </div>
      ) : null}
      {resendNotice ? (
        <p className="text-[13px] text-[#86efac]" role="status">
          {resendNotice}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
