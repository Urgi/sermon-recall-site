'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { queueAppToast } from '@/lib/app-toast';
import {
  EMAIL_CONFIRMED_MESSAGE,
  SIGNUP_CODE_SENT_MESSAGE,
  USE_CODE_NOT_LINK_MESSAGE,
} from '@/lib/auth/signup-email-messages';
import { ensurePublicUserProfile } from '@/lib/auth/ensure-public-profile';
import { mapAuthError } from '@/lib/auth/mapAuthError';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = {
  initialEmail?: string;
  linkRejected?: boolean;
};

export function VerifyEmailForm({ initialEmail = '', linkRejected = false }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendNotice(null);
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail) {
      setError('Enter the email you registered with.');
      return;
    }
    if (trimmedCode.length < 6) {
      setError('Enter the confirmation code from your email.');
      return;
    }
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedCode,
        type: 'signup',
      });
      if (verifyError) {
        setError(mapAuthError(verifyError.message));
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await ensurePublicUserProfile(supabase, session.user);
        if (!profile.ok) {
          setError(profile.error);
          return;
        }
      }
      queueAppToast({ variant: 'success', message: EMAIL_CONFIRMED_MESSAGE });
      router.refresh();
      router.replace('/dashboard?welcome=1');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    if (!email.trim()) {
      setResendNotice('Enter your email above first.');
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
      setResendNotice(
        resendError ? mapAuthError(resendError.message) : 'New code sent. Check your inbox and spam.',
      );
    } catch {
      setResendNotice('Network error. Try again.');
    } finally {
      setResendPending(false);
    }
  }

  return (
    <form onSubmit={onVerify} className="mt-6 space-y-4">
      <p className="text-[14px] leading-relaxed text-[#94a3b8]">
        Enter the confirmation code from your email. Links in that email cannot confirm your
        account — the code is required.
      </p>

      {linkRejected ? (
        <p className="rounded-lg border border-red-500/35 bg-red-950/40 px-3 py-2 text-[13px] leading-relaxed text-red-100" role="alert">
          {USE_CODE_NOT_LINK_MESSAGE}
        </p>
      ) : null}

      <div>
        <label htmlFor="verify-email" className="block text-[13px] font-medium text-[#94a3b8]">
          Email
        </label>
        <input
          id="verify-email"
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
        <label htmlFor="verify-code" className="block text-[13px] font-medium text-[#94a3b8]">
          Confirmation code
        </label>
        <input
          id="verify-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          required
          disabled={pending}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 font-mono text-[17px] tracking-widest text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2 disabled:opacity-60"
        />
      </div>

      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
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
        {pending ? 'Confirming…' : 'Confirm email'}
      </button>

      <button
        type="button"
        disabled={resendPending || pending}
        onClick={() => void onResend()}
        className="block w-full text-center text-[13px] font-medium text-[#38bdf8] hover:underline disabled:opacity-60"
      >
        {resendPending ? 'Sending…' : 'Resend confirmation code'}
      </button>

      <p className="text-center text-[13px] text-[#64748b]">
        <Link href="/login" className="text-[#38bdf8] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
