import { NextResponse } from 'next/server';

import { authorizeApiWithChurch, getChurchForProfile } from '@/lib/auth/server';
import { buildMemberJoinUrl } from '@/lib/church/member-join';
import { qrPngDataUrl } from '@/lib/church/qr';
import { sendMemberJoinEmail } from '@/lib/email/send-member-join';
import { checkRateLimit } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const auth = await authorizeApiWithChurch();
  if (!auth.ok) return auth.response;

  let body: { to?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const churchId = auth.ctx.profile.church_id!;
  const limit = await checkRateLimit(`member-share:${churchId}`, 30, 24 * 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many emails sent today. Try again tomorrow.' }, { status: 429 });
  }

  const church = await getChurchForProfile(churchId);
  if (!church?.church_code) {
    return NextResponse.json({ error: 'Church not found.' }, { status: 404 });
  }

  const joinUrl = buildMemberJoinUrl(church.church_code);
  const qrDataUrl = await qrPngDataUrl(joinUrl);

  try {
    await sendMemberJoinEmail({
      to,
      churchName: church.name,
      churchCode: church.church_code,
      joinUrl,
      qrDataUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Send failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  return NextResponse.json({
    ok: true,
    message: hasResend
      ? `Join instructions sent to ${to}.`
      : `Email logged (RESEND_API_KEY not set). Add the key on Vercel to send for real.`,
  });
}
