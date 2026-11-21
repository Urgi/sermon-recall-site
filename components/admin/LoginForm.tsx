'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { sendEmailOtp, verifyEmailOtp } from '@/lib/auth/email-otp';
import { mapAuthError } from '@/lib/auth/mapAuthError';
import { USE_CODE_NOT_LINK_MESSAGE } from '@/lib/auth/signup-email-messages';
import { ensurePublicUserProfile } from '@/lib/auth/ensure-public-profile';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from '@/components/auth/authFormStyles';

type Props = {
  nextPath: string;
  initialEmail?: string;
  linkRejected?: boolean;
};

type Step = 'email' | 'code';
/** How the person reached the code step: we just emailed a code, or they already had one. */
type CodeSource = 'sent' | 'existing';

const inputClass = authInputClass;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when someone typed or pasted their sign-in code into the email field. */
function looksLikeCode(value: string): boolean {
  return /^\d{6,8}$/.test(value.replace(/\s/g, ''));
}

export function LoginForm({ nextPath, initialEmail = '', linkRejected = false }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [codeSource, setCodeSource] = useState<CodeSource>('sent');
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
    setError(null);
    setNotice(null);
  }

  async function onSendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setNotice(null);
    const trimmed = email.trim().toLowerCase();
    if (looksLikeCode(trimmed)) {
      keepCodeAndAskForEmail(trimmed);
      return;
    }
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address, like pastor@yourchurch.org.');
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
    setCodeSource('sent');
    setStep('code');
    setNotice('Code sent. Check your inbox and spam.');
  }

  /** A code landed in the email field: hold on to it and ask for the email it was sent to. */
  function keepCodeAndAskForEmail(value: string) {
    setCode(value.replace(/\s/g, ''));
    setEmail('');
    setError(
      'That looks like a sign-in code. Enter your email first, then choose “I already have a code”. We kept your code.',
    );
  }

  /** Skip sending: go straight to the code screen for a code they already have. */
  function goToCodeStep() {
    setError(null);
    setNotice(null);
    const trimmed = email.trim().toLowerCase();
    if (looksLikeCode(trimmed)) {
      keepCodeAndAskForEmail(trimmed);
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter the email your code was sent to first.');
      return;
    }
    setCodeSource('existing');
    setStep('code');
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
    <form
      key={step}
      onSubmit={step === 'email' ? onSendCode : onVerify}
      noValidate
      className="admin-page-enter mt-6 space-y-4"
    >
      {step === 'code' ? (
        <button
          type="button"
          onClick={backToEmail}
          className="-ml-2 inline-flex min-h-10 items-center rounded-md px-2 text-[14px] font-semibold text-[#38bdf8] hover:underline"
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
            {codeSource === 'sent' ? 'We sent a code to ' : 'Enter the code we emailed to '}
            <span className="break-all text-[#e2e8f0]">{email.trim().toLowerCase()}</span>.
          </p>
        </div>
      ) : null}

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
          <label htmlFor="login-email" className={authLabelClass}>
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
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
        <p id="login-error" className="text-[13px] leading-relaxed text-red-400" role="alert">
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
        className={authPrimaryButtonClass}
      >
        {pending
          ? step === 'email'
            ? 'Sending…'
            : 'Signing in…'
          : step === 'email'
            ? 'Email me a code'
            : 'Verify code'}
      </button>

      {step === 'email' ? (
        <button
          type="button"
          onClick={goToCodeStep}
          disabled={pending}
          className={authSecondaryButtonClass}
        >
          I already have a code
        </button>
      ) : null}

      {step === 'code' ? (
        <button
          type="button"
          disabled={resendPending || pending}
          onClick={() => void onResend()}
          className="block min-h-11 w-full py-2 text-center text-[15px] font-medium text-[#38bdf8] hover:underline disabled:opacity-60"
        >
          {resendPending ? 'Sending…' : codeSource === 'existing' ? 'Email me a new code' : 'Resend code'}
        </button>
      ) : null}
    </form>
  );
}
