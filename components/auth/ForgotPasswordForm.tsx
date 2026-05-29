'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { queueAppToast } from '@/lib/app-toast';
import { mapAuthError } from '@/lib/auth/mapAuthError';
import { PASSWORD_RESET_CODE_SENT_MESSAGE } from '@/lib/auth/signup-email-messages';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const trimmedEmail = email.trim();
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (resetError) {
        setError(mapAuthError(resetError.message));
        return;
      }
      queueAppToast({ variant: 'success', message: PASSWORD_RESET_CODE_SENT_MESSAGE });
      router.push(`/reset-password?email=${encodeURIComponent(trimmedEmail)}`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setPending(false);
    }
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
        {pending ? 'Sending…' : 'Send reset code'}
      </button>
      <p className="text-center text-[13px] text-[#64748b]">
        <Link href="/login" className="text-[#38bdf8] hover:underline">
          Back to sign in
        </Link>
        {' · '}
        <Link href="/reset-password" className="text-[#38bdf8] hover:underline">
          Already have a code?
        </Link>
      </p>
    </form>
  );
}
