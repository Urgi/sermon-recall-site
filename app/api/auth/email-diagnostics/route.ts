import { NextResponse } from 'next/server';

import { buildEmailDiagnostics } from '@/lib/auth/email-diagnostics';
import { getAdminEmailRedirectUrlServer } from '@/lib/auth/admin-callback-url';
import { sendSignupConfirmationEmail } from '@/lib/email/send-auth-email';
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

/** POST { email, dryRun?: boolean } — test generateLink + optional Resend send. */
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
  const redirectTo = getAdminEmailRedirectUrlServer(undefined, origin);

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({
      ...report,
      step: 'generateLink',
      ok: false,
      error: 'SUPABASE_SERVICE_ROLE_KEY missing',
    });
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: redirectTo ?? undefined },
  });

  if (error) {
    return NextResponse.json({
      ...report,
      step: 'generateLink',
      ok: false,
      error: error.message,
    });
  }

  const actionLink = data.properties?.action_link ?? null;
  const result: Record<string, unknown> = {
    ...report,
    step: 'generateLink',
    ok: true,
    linkHost: actionLink ? new URL(actionLink).host : null,
    redirectTo,
  };

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev && actionLink) {
    result.debugActionLink = actionLink;
  }

  if (body.dryRun) {
    result.sent = false;
    result.note = 'dryRun=true — no email sent';
    return NextResponse.json(result);
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    result.sent = false;
    result.error = 'RESEND_API_KEY missing — cannot send. Use debugActionLink locally or Inbucket.';
    return NextResponse.json(result);
  }

  if (!actionLink) {
    return NextResponse.json({ ...result, sent: false, error: 'No action_link' });
  }

  try {
    await sendSignupConfirmationEmail({ to: email, confirmUrl: actionLink });
    result.sent = true;
    result.sentVia = 'resend';
    result.message = `Email sent to ${email}`;
  } catch (e) {
    result.sent = false;
    result.error = e instanceof Error ? e.message : 'Send failed';
  }

  return NextResponse.json(result);
}
