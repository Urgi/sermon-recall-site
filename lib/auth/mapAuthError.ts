/** Maps Supabase Auth errors to user-safe copy (avoid leaking internals). */
export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'This email is not confirmed yet. Enter the confirmation code from your inbox on the verify screen (check spam), or resend the code below.';
  }
  if (
    m.includes('token has expired') ||
    m.includes('otp_expired') ||
    (m.includes('expired') && m.includes('otp'))
  ) {
    return 'That code expired. Request a new confirmation code and try again.';
  }
  if (m.includes('invalid') && (m.includes('otp') || m.includes('token') || m.includes('code'))) {
    return 'That confirmation code is invalid. Check the latest email and try again, or resend a new code.';
  }
  if (m.includes('invalid login credentials')) {
    return 'That code is incorrect. Check the latest email and try again.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Sign in with a code instead.';
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch')) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('over_email_send')) {
    return 'Too many sign-up or email attempts from this device. Wait 15–60 minutes, or delete the test user in Supabase → Authentication → Users, then try again.';
  }
  if (m.includes('redirect') || m.includes('redirect_to')) {
    return 'Email could not be sent: admin callback URL is not allowlisted in Supabase → Authentication → URL configuration.';
  }
  return 'Something went wrong. Please try again.';
}
