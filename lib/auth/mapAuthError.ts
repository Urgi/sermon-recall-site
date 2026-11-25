import { tr } from '@/lib/i18n/ui';

/** Maps Supabase Auth errors to user-safe copy in the visitor's language (avoid leaking internals). */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return tr('authErr.notConfirmed');
  }
  if (
    m.includes('token has expired') ||
    m.includes('otp_expired') ||
    (m.includes('expired') && m.includes('otp'))
  ) {
    return tr('authErr.expired');
  }
  if (m.includes('invalid') && (m.includes('otp') || m.includes('token') || m.includes('code'))) {
    return tr('authErr.invalidCode');
  }
  if (m.includes('invalid login credentials')) {
    return tr('authErr.wrongCode');
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return tr('authErr.exists');
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch')) {
    return tr('authErr.network');
  }
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('over_email_send')) {
    return tr('authErr.rateLimit');
  }
  if (m.includes('redirect') || m.includes('redirect_to')) {
    return tr('authErr.redirect');
  }
  return tr('authErr.generic');
}
