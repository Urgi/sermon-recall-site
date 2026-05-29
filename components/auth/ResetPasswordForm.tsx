'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { queueAppToast } from '@/lib/app-toast';
import { mapAuthError } from '@/lib/auth/mapAuthError';
import {
  PASSWORD_UPDATED_MESSAGE,
  USE_RESET_CODE_NOT_LINK_MESSAGE,
} from '@/lib/auth/signup-email-messages';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const MIN_PASSWORD_LENGTH = 8;

type Props = {
  initialEmail?: string;
  linkRejected?: boolean;
};

export function ResetPasswordForm({ initialEmail = '', linkRejected = false }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  async function onResend() {
    if (!email.trim()) {
      setResendNotice('Enter your email above first.');
      return;
    }
    setResendPending(true);
    setResendNotice(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      setResendNotice(
        resetError ? mapAuthError(resetError.message) : 'New reset code sent. Check inbox and spam.',
      );
    } catch {
      setResendNotice('Network error. Try again.');
    } finally {
      setResendPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendNotice(null);
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (trimmedCode.length < 6) {
      setError('Enter the reset code from your email.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedCode,
        type: 'recovery',
      });
      if (verifyError) {
        setError(mapAuthError(verifyError.message));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(mapAuthError(updateError.message));
        return;
      }

      queueAppToast({ variant: 'success', message: PASSWORD_UPDATED_MESSAGE });
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <p className="text-[14px] leading-relaxed text-[#94a3b8]">
        Enter the reset code from your email, then choose a new password. Links in that email cannot
        reset your password — the code is required.
      </p>

      {linkRejected ? (
        <p className="rounded-lg border border-red-500/35 bg-red-950/40 px-3 py-2 text-[13px] leading-relaxed text-red-100" role="alert">
          {USE_RESET_CODE_NOT_LINK_MESSAGE}
        </p>
      ) : null}

      <div>
        <label htmlFor="reset-email" className="block text-[13px] font-medium text-[#94a3b8]">
          Email
        </label>
        <input
          id="reset-email"
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
        <label htmlFor="reset-code" className="block text-[13px] font-medium text-[#94a3b8]">
          Reset code
        </label>
        <input
          id="reset-code"
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
      <div>
        <label htmlFor="new-password" className="block text-[13px] font-medium text-[#94a3b8]">
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          disabled={pending}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2 disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-[13px] font-medium text-[#94a3b8]">
          Confirm password
        </label>
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          disabled={pending}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2 disabled:opacity-60"
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
        {pending ? 'Updating…' : 'Update password'}
      </button>
      <button
        type="button"
        disabled={resendPending || pending}
        onClick={() => void onResend()}
        className="block w-full text-center text-[13px] font-medium text-[#38bdf8] hover:underline disabled:opacity-60"
      >
        {resendPending ? 'Sending…' : 'Resend reset code'}
      </button>
      <p className="text-center text-[13px] text-[#64748b]">
        <Link href="/login" className="text-[#38bdf8] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
