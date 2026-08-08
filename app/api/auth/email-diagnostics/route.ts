import { NextResponse } from 'next/server';

import { buildEmailDiagnostics } from '@/lib/auth/email-diagnostics';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

function devOnly() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Auth email diagnostics are disabled in production.' },
      { status: 404 },
    );
  }
  return null;
}

/** GET ?email=... — configuration + user state (no email sent). */
export async function GET(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  const url = new URL(request.url);
  const email = url.searchParams.get('email') ?? undefined;
  const origin = request.headers.get('origin');
  const report = await buildEmailDiagnostics(email, origin);
  return NextResponse.json(report);
}

/**
 * POST { email, dryRun?: boolean } — exercises signup OTP (code), not magic links.
 * Uses admin.generateLink({ type: 'signup' }) so local Inbucket / hosted Auth mailer
 * receive the same confirmation-code email as /register.
 */
export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;
  let body: { email?: string; dryRun?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const origin = request.headers.get('origin');
  const report = await buildEmailDiagnostics(email, origin);

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({
      ...report,
      step: 'signup_otp',
      ok: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY missing',
    });
  }

  const tempPassword = `Diag-${Math.random().toString(36).slice(2)}A1!`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password: tempPassword,
  });

  if (error) {
    return NextResponse.json({
      ...report,
      step: 'generateLink_signup',
      ok: false,
      error: error.message,
      hint: 'If the user already exists and is confirmed, delete them in Auth → Users or use a new email.',
    });
  }

  const emailOtp =
    typeof data.properties?.email_otp === 'string' ? data.properties.email_otp : null;
  const result: Record<string, unknown> = {
    ...report,
    step: 'generateLink_signup',
    ok: true,
    hasEmailOtp: Boolean(emailOtp),
    otpLength: emailOtp?.length ?? null,
    note: 'Signup OTP path (same family as /register → /verify-email). Enter code on /verify-email.',
  };

  if (process.env.NODE_ENV === 'development' && emailOtp) {
    result.debugEmailOtp = emailOtp;
  }

  if (body.dryRun) {
    result.sent = false;
    result.note =
      'dryRun=true — link/OTP generated but mailer not relied on. Local: also check Inbucket if confirmations are on.';
    return NextResponse.json(result);
  }

  // generateLink triggers the Auth mailer when confirmations are enabled.
  result.sent = true;
  result.sentVia = 'supabase_auth_mailer';
  result.message = `Signup confirmation code generated for ${email}. Local → Inbucket http://127.0.0.1:54324. Hosted → inbox/spam. Paste code on /verify-email.`;

  return NextResponse.json(result);
}
