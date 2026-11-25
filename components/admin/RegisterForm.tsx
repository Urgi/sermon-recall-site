'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { queueAppToast } from '@/lib/app-toast';
import { sendEmailOtp } from '@/lib/auth/email-otp';
import { signupCodeSentMessage } from '@/lib/auth/signup-email-messages';
import {
  APP_LANGUAGES,
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
  const { t, language, setLanguage } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError(t('auth.err.enterEmail'));
      setPending(false);
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: err } = await sendEmailOtp(supabase, trimmedEmail, {
        createUser: true,
        fullName: fullName.trim() || undefined,
        preferredLanguage: language,
        signupPortal: 'admin_web',
      });

      if (err) {
        setError(err);
        return;
      }

      queueAppToast({ variant: 'success', message: signupCodeSentMessage() });
      router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`);
    } catch {
      setError(t('auth.err.network'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="reg-name" className={authLabelClass}>
          {t('reg.fullName')}
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
          {t('auth.email')}
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
          {t('settings.preferredLanguage')}
        </label>
        <p className={authHintClass}>
          {t('reg.languageHint')}
        </p>
        <select
          id="reg-language"
          name="preferredLanguage"
          disabled={pending}
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value as AppLanguage);
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
          {error === t('authErr.exists') ? (
            <>
              {' '}
              <Link href="/login" className="text-[#38bdf8] hover:underline">
                {t('reg.signInWithCode')}
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
        {pending ? t('auth.sending') : t('auth.emailMeCode')}
      </button>
    </form>
  );
}
