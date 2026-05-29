import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resend signup confirmation OTP (same as client auth.resend — for optional server-side use).
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: 'Supabase is not configured on the server.' },
      { status: 503 },
    );
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') && msg.includes('confirmed')) {
      return NextResponse.json({
        message: 'This email is already confirmed. Try signing in with your password.',
        alreadyConfirmed: true,
      });
    }
    console.warn('[auth/resend-confirmation]', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({
    message: 'Confirmation code sent. Check inbox and spam.',
    sentVia: 'supabase',
  });
}
