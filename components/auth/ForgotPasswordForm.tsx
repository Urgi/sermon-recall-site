'use client';

import Link from 'next/link';
import { useState } from 'react';

import { queueAppToast } from '@/lib/app-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { mapAuthError } from '@/lib/auth/mapAuthError';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/reset-password`
        : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setPending(false);
    if (resetError) {
      setError(mapAuthError(resetError.message));
      return;
    }
    setSent(true);
    queueAppToast({
      variant: 'success',
      message:
        'If an account exists for that email, we sent password reset instructions. Check your inbox and spam folder.',
    });
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-[14px] leading-relaxed text-[#86efac]" role="status">
          Check your email for a reset link. It expires after a short time — request another if needed.
        </p>
        <Link
          href="/login"
          className="inline-block text-[14px] font-medium text-[#38bdf8] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="forgot-email" className="block text-[13px] font-medium text-[#94a3b8]">
          Email
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
      <p className="text-center text-[13px] text-[#64748b]">
        <Link href="/login" className="text-[#38bdf8] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
