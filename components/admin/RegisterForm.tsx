'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { queueAppToast } from '@/lib/app-toast';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { mapAuthError } from '@/lib/auth/mapAuthError';
import { SIGNUP_CODE_SENT_MESSAGE } from '@/lib/auth/signup-email-messages';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const MIN_PASSWORD_LENGTH = 8;

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }
    setPending(true);
    const trimmedEmail = email.trim();

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: signError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
            signup_portal: 'admin_web',
          },
        },
      });

      if (signError) {
        setError(mapAuthError(signError.message));
        return;
      }
      if (data.user?.identities?.length === 0) {
        setError(
          'An account with this email already exists. Try signing in or reset your password.',
        );
        return;
      }
      if (data.session) {
        queueAppToast({
          variant: 'success',
          message: 'Account created. Taking you to your dashboard…',
        });
        router.refresh();
        router.push('/dashboard?welcome=1');
        return;
      }

      queueAppToast({ variant: 'success', message: SIGNUP_CODE_SENT_MESSAGE });
      router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="reg-name" className="block text-[13px] font-medium text-[#94a3b8]">
          Full name
        </label>
        <input
          id="reg-name"
          name="fullName"
          type="text"
          autoComplete="name"
          disabled={pending}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2 disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-[13px] font-medium text-[#94a3b8]">
          Email
        </label>
        <input
          id="reg-email"
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
        <label htmlFor="reg-password" className="block text-[13px] font-medium text-[#94a3b8]">
          Password
        </label>
        <PasswordInput
          id="reg-password"
          name="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          disabled={pending}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1 text-[12px] text-[#64748b]">At least {MIN_PASSWORD_LENGTH} characters</p>
      </div>
      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
          {error.includes('already exists') ? (
            <>
              {' '}
              <Link href="/forgot-password" className="text-[#38bdf8] hover:underline">
                Reset password
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
