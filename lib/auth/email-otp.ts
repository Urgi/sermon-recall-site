import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isAppReviewEmail,
  isAppReviewSignIn,
} from '@/lib/auth/app-review-sign-in';
import { mapAuthError } from '@/lib/auth/mapAuthError';

export type SendEmailOtpOptions = {
  fullName?: string;
  preferredLanguage?: string;
  signupPortal?: 'admin_web' | 'mobile';
  /** false = existing accounts only (sign-in). Default true for registration. */
  createUser?: boolean;
};

export async function sendEmailOtp(
  supabase: SupabaseClient,
  email: string,
  options?: SendEmailOtpOptions,
): Promise<{ error: string | null }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: 'Enter your email address.' };

  if (isAppReviewEmail(trimmed)) {
    return { error: null };
  }

  const createUser = options?.createUser !== false;
  const lang =
    options?.preferredLanguage === 'es' ||
    options?.preferredLanguage === 'fr' ||
    options?.preferredLanguage === 'en'
      ? options.preferredLanguage
      : 'en';

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: createUser,
      data: createUser
        ? {
            full_name: options?.fullName?.trim() || undefined,
            preferred_language: lang,
            signup_portal: options?.signupPortal ?? 'admin_web',
          }
        : undefined,
    },
  });

  return { error: error ? mapAuthError(error.message) : null };
}

export async function verifyEmailOtp(
  supabase: SupabaseClient,
  email: string,
  token: string,
): Promise<{ error: string | null }> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  if (isAppReviewSignIn(trimmedEmail, trimmedToken)) {
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedToken,
    });
    return { error: error ? mapAuthError(error.message) : null };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: 'email',
  });

  return { error: error ? mapAuthError(error.message) : null };
}
