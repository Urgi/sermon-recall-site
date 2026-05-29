import { NextResponse } from 'next/server';

import { ensurePublicUserProfile } from '@/lib/auth/ensure-public-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Legacy pastor registration via service role — auto-confirms email (skips OTP flow).
 * Prefer client signUp + /verify-email for new registrations.
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string; fullName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ useClientSignup: true }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || undefined,
      signup_portal: 'admin_web',
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json(
        {
          error:
            'An account with this email already exists. Try signing in or reset your password.',
        },
        { status: 409 },
      );
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return NextResponse.json(
        {
          error:
            'Supabase is temporarily limiting sign-ups from this network. Wait 15–60 minutes, or delete the test user in Supabase → Authentication → Users and try again.',
        },
        { status: 429 },
      );
    }
    console.warn('[auth/register-admin]', error.message);
    return NextResponse.json(
      { error: 'Could not create account. Try again in a minute.' },
      { status: 502 },
    );
  }

  const user = data.user;
  if (user) {
    const profile = await ensurePublicUserProfile(admin, user);
    if (!profile.ok) {
      console.warn('[auth/register-admin] profile', profile.error);
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'Account created. You can sign in now — no email confirmation required.',
  });
}
