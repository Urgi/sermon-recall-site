import { NextResponse } from 'next/server';

import { getAdminEmailRedirectUrlServer } from '@/lib/auth/admin-callback-url';
import { sendSignupConfirmationEmail } from '@/lib/email/send-auth-email';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resend signup confirmation using admin generateLink + Resend (reliable delivery).
 * Falls back to guidance when Resend/service role is unavailable.
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

  const requestOrigin = request.headers.get('origin');
  const redirectTo = getAdminEmailRedirectUrlServer(undefined, requestOrigin);
  if (!redirectTo) {
    return NextResponse.json(
      {
        error:
          'Could not determine your admin site URL. Add NEXT_PUBLIC_SITE_URL in Vercel (your pastor login URL, e.g. https://admin.sermonrecall.com). This is not the same as NEXT_PUBLIC_SUPABASE_URL.',
      },
      { status: 503 },
    );
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      {
        error: 'Confirmation resend is not configured (missing SUPABASE_SERVICE_ROLE_KEY).',
        useClientFallback: true,
      },
      { status: 503 },
    );
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return NextResponse.json(
      {
        error:
          'Confirmation email is not configured. Add RESEND_API_KEY on Vercel (same as team invites), or turn off “Confirm email” in Supabase Auth settings.',
        useClientFallback: true,
      },
      { status: 503 },
    );
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already') && msg.includes('confirmed')) {
      return NextResponse.json({
        message: 'This email is already confirmed. Try signing in with your password.',
        alreadyConfirmed: true,
      });
    }
    if (msg.includes('not found') || msg.includes('no user')) {
      return NextResponse.json(
        { error: 'No account found for this email. Register first, then resend.' },
        { status: 404 },
      );
    }
    console.warn('[auth/resend-confirmation] generateLink', error.message);
    return NextResponse.json(
      { error: 'Could not create confirmation link. Try again in a minute.' },
      { status: 502 },
    );
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    console.warn('[auth/resend-confirmation] missing action_link', data);
    return NextResponse.json(
      { error: 'Could not build confirmation link. Try again later.' },
      { status: 502 },
    );
  }

  try {
    await sendSignupConfirmationEmail({ to: email, confirmUrl: actionLink });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Send failed';
    console.warn('[auth/resend-confirmation] resend', errMsg);
    return NextResponse.json({ error: errMsg }, { status: 502 });
  }

  const payload: Record<string, unknown> = {
    message:
      'Confirmation email sent from Sermon Recall. Check inbox and spam. Open the link in your browser (not the member app).',
    sentVia: 'resend',
    redirectTo,
  };
  if (process.env.NODE_ENV === 'development') {
    payload.debugActionLink = actionLink;
  }
  return NextResponse.json(payload);
}
