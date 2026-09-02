'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { sendEmailOtp, verifyEmailOtp } from '@/lib/auth/email-otp';
import { mapAuthError } from '@/lib/auth/mapAuthError';
import { USE_CODE_NOT_LINK_MESSAGE } from '@/lib/auth/signup-email-messages';
import { ensurePublicUserProfile } from '@/lib/auth/ensure-public-profile';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = {
  nextPath: string;
  initialEmail?: string;
  linkRejected?: boolean;
};

type Step = 'email' | 'code';

const inputClass =
  'mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2 disabled:opacity-60';

export function LoginForm({ nextPath, initialEmail = '', linkRejected = false }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.refresh();
        router.replace(nextPath);
      }
    });
  }, [router, nextPath]);

  async function onSendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error: err } = await sendEmailOtp(supabase, trimmed, { createUser: false });
    setPending(false);
    if (err) {
      setError(err);
      return;
    }
    setStep('code');
    setNotice('Code sent. Check your inbox and spam.');
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    if (trimmedCode.length < 6) {
      setError('Enter the 6+ digit code from your email.');
      return;
    }
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: err } = await verifyEmailOtp(supabase, trimmedEmail, trimmedCode);
      if (err) {
        setError(err);
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
      router.refresh();
      router.push(nextPath);
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    setResendPending(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const { error: err } = await sendEmailOtp(supabase, email.trim().toLowerCase(), {
      createUser: false,
    });
    setResendPending(false);
    setNotice(err ?? 'New code sent. Check inbox and spam.');
  }

  return (
    <form onSubmit={step === 'email' ? onSendCode : onVerify} className="mt-6 space-y-4">
      {linkRejected ? (
        <p
          className="rounded-lg border border-red-500/35 bg-red-950/40 px-3 py-2 text-[13px] leading-relaxed text-red-100"
          role="alert"
        >
          {USE_CODE_NOT_LINK_MESSAGE}
        </p>
      ) : null}

      <p className="text-[14px] leading-relaxed text-[#94a3b8]">
        {step === 'email'
          ? 'We’ll email you a one-time code — no password needed.'
          : `Enter the code we sent to ${email.trim().toLowerCase()}.`}
      </p>

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
          disabled={pending || step === 'code'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      {step === 'code' ? (
        <div>
          <label htmlFor="login-code" className="block text-[13px] font-medium text-[#94a3b8]">
            Sign-in code
          </label>
          <p className="mt-0.5 text-[12px] text-[#64748b]">6-digit code from your email (check spam).</p>
          <input
            id="login-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            required
            disabled={pending}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={`${inputClass} font-mono text-[17px] tracking-widest`}
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-[13px] text-[#86efac]" role="status">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
      >
        {pending
          ? step === 'email'
            ? 'Sending…'
            : 'Signing in…'
          : step === 'email'
            ? 'Email me a code'
            : 'Verify & sign in'}
      </button>

      {step === 'code' ? (
        <>
          <button
            type="button"
            disabled={resendPending || pending}
            onClick={() => void onResend()}
            className="block w-full text-center text-[13px] font-medium text-[#38bdf8] hover:underline disabled:opacity-60"
          >
            {resendPending ? 'Sending…' : 'Resend code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
              setNotice(null);
            }}
            className="block w-full text-center text-[13px] font-medium text-[#38bdf8] hover:underline"
          >
            Use a different email
          </button>
        </>
      ) : null}
    </form>
  );
}
