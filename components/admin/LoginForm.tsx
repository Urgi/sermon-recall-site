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
  'mt-1 w-full rounded-xl border border-[rgba(56,189,248,0.22)] bg-[#0b1220] px-4 py-3.5 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2 disabled:opacity-60';

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

  function backToEmail() {
    setStep('email');
    setCode('');
    setError(null);
    setNotice(null);
  }

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

  const emailReady = email.trim().length > 0;
  const codeReady = code.trim().length >= 6;

  return (
    <form onSubmit={step === 'email' ? onSendCode : onVerify} className="mt-6 space-y-4">
      {step === 'code' ? (
        <button
          type="button"
          onClick={backToEmail}
          className="text-[14px] font-semibold text-[#38bdf8] hover:underline"
        >
          ← Back
        </button>
      ) : null}

      {step === 'code' ? (
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#38bdf8]">
            Verification
          </p>
          <h2 className="mt-2 text-[28px] font-bold leading-tight text-white">Enter your code</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#94a3b8]">
            We sent a code to {email.trim().toLowerCase()}.
          </p>
        </div>
      ) : (
        <p className="text-[14px] leading-relaxed text-[#94a3b8]">
          We’ll email you a one-time code — no password needed.
        </p>
      )}

      {linkRejected ? (
        <p
          className="rounded-xl border border-red-500/35 bg-red-950/40 px-3 py-2 text-[13px] leading-relaxed text-red-100"
          role="alert"
        >
          {USE_CODE_NOT_LINK_MESSAGE}
        </p>
      ) : null}

      {step === 'email' ? (
        <div>
          <label htmlFor="login-email" className="block text-[13px] font-semibold text-white">
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
            className={inputClass}
          />
        </div>
      ) : (
        <div>
          <label htmlFor="login-code" className="sr-only">
            Sign-in code
          </label>
          <input
            id="login-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            required
            disabled={pending}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className={`${inputClass} text-center text-[28px] font-semibold tracking-[0.35em]`}
          />
        </div>
      )}

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
        disabled={
          pending || (step === 'email' ? !emailReady : !codeReady)
        }
        className="w-full rounded-full bg-[#0ea5e9] px-4 py-3.5 text-[16px] font-semibold text-white hover:bg-[#0284c7] disabled:cursor-not-allowed disabled:border disabled:border-[rgba(56,189,248,0.22)] disabled:bg-[#0b1220] disabled:text-[#64748b]"
      >
        {pending
          ? step === 'email'
            ? 'Sending…'
            : 'Signing in…'
          : step === 'email'
            ? 'Email me a code'
            : 'Verify code'}
      </button>

      {step === 'code' ? (
        <button
          type="button"
          disabled={resendPending || pending}
          onClick={() => void onResend()}
          className="block w-full py-2 text-center text-[15px] font-medium text-[#38bdf8] hover:underline disabled:opacity-60"
        >
          {resendPending ? 'Sending…' : 'Resend code'}
        </button>
      ) : null}
    </form>
  );
}
