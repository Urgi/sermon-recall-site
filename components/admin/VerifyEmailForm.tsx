'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { queueAppToast } from '@/lib/app-toast';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/auth/email-otp';
import {
  EMAIL_CONFIRMED_MESSAGE,
  USE_CODE_NOT_LINK_MESSAGE,
} from '@/lib/auth/signup-email-messages';
import { ensurePublicUserProfile } from '@/lib/auth/ensure-public-profile';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  authHintClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from '@/components/auth/authFormStyles';

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
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();
    if (!trimmedEmail) {
      setError('Enter the email you registered with.');
      return;
    }
    if (trimmedCode.length < 6) {
      setError('Enter the code from your email.');
      return;
    }
    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: verifyError } = await verifyEmailOtp(supabase, trimmedEmail, trimmedCode);
      if (verifyError) {
        setError(verifyError);
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
    const supabase = createBrowserSupabaseClient();
    const { error: resendError } = await sendEmailOtp(supabase, email.trim().toLowerCase(), {
      createUser: true,
      signupPortal: 'admin_web',
    });
    setResendPending(false);
    setResendNotice(resendError ?? 'New code sent. Check your inbox and spam.');
  }

  return (
    <form onSubmit={onVerify} className="mt-6 space-y-4">
      <p className="text-[14px] leading-relaxed text-[#94a3b8]">
        Enter the one-time code we emailed when you registered. Already have an account?{' '}
        <Link href="/login" className="text-[#38bdf8] hover:underline">
          Sign in instead
        </Link>
        .
      </p>

      {linkRejected ? (
        <p
          className="rounded-lg border border-red-500/35 bg-red-950/40 px-3 py-2 text-[13px] leading-relaxed text-red-100"
          role="alert"
        >
          {USE_CODE_NOT_LINK_MESSAGE}
        </p>
      ) : null}

      <div>
        <label htmlFor="verify-email" className={authLabelClass}>
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
          className={authInputClass}
        />
      </div>
      <div>
        <label htmlFor="verify-code" className={authLabelClass}>
          Confirmation code
        </label>
        <p className={authHintClass}>6-digit code from your email (check spam).</p>
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
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className={`${authInputClass} font-mono text-[17px] tracking-widest`}
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
        className={authPrimaryButtonClass}
      >
        {pending ? 'Verifying…' : 'Verify code'}
      </button>

      <button
        type="button"
        disabled={resendPending || pending}
        onClick={() => void onResend()}
        className="block min-h-11 w-full py-2 text-center text-[13px] font-medium text-[#38bdf8] hover:underline disabled:opacity-60"
      >
        {resendPending ? 'Sending…' : 'Resend code'}
      </button>

      <p className="text-center text-[13px] text-[#94a3b8]">
        <Link href="/login" className="text-[#38bdf8] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
