'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { queueAppToast } from '@/lib/app-toast';
import { sendEmailOtp } from '@/lib/auth/email-otp';
import { SIGNUP_CODE_SENT_MESSAGE } from '@/lib/auth/signup-email-messages';
import {
  APP_LANGUAGES,
  DEFAULT_APP_LANGUAGE,
  type AppLanguage,
  languageOptionLabel,
} from '@/lib/i18n/languages';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  authHintClass,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from '@/components/auth/authFormStyles';
import { useLanguage } from '@/components/i18n/LanguageProvider';

const inputClass = authInputClass;

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const { setLanguage } = useLanguage();
  const [preferredLanguage, setPreferredLanguage] =
    useState<AppLanguage>(DEFAULT_APP_LANGUAGE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      setPending(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: err } = await sendEmailOtp(supabase, trimmedEmail, {
        createUser: true,
        fullName: fullName.trim() || undefined,
        preferredLanguage,
        signupPortal: 'admin_web',
      });

      if (err) {
        setError(err);
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
        <label htmlFor="reg-name" className={authLabelClass}>
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
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="reg-email" className={authLabelClass}>
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
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="reg-language" className={authLabelClass}>
          Preferred language
        </label>
        <p className={authHintClass}>
          English, Spanish, or French — you can change this later in settings.
        </p>
        <select
          id="reg-language"
          name="preferredLanguage"
          disabled={pending}
          value={preferredLanguage}
          onChange={(e) => {
            const next = e.target.value as AppLanguage;
            setPreferredLanguage(next);
            setLanguage(next);
          }}
          className={inputClass}
        >
          {APP_LANGUAGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {languageOptionLabel(opt.value)}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
          {error.includes('already exists') ? (
            <>
              {' '}
              <Link href="/login" className="text-[#38bdf8] hover:underline">
                Sign in with a code
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={authPrimaryButtonClass}
      >
        {pending ? 'Sending…' : 'Email me a code'}
      </button>
    </form>
  );
}
