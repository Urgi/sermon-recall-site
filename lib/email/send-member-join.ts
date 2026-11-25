import { memberJoinCopy } from '@/lib/email/email-copy';
import {
  buildMemberJoinEmailHtml,
  buildMemberJoinEmailText,
} from '@/lib/church/member-join';

type SendMemberJoinEmailParams = {
  to: string;
  churchName: string;
  churchCode: string;
  joinUrl: string;
  qrDataUrl: string;
  /** Church language (en, es, fr). */
  language?: string | null;
};

export async function sendMemberJoinEmail(params: SendMemberJoinEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_EMAIL_FROM?.trim() ?? 'Sermon Recall <onboarding@resend.dev>';

  const subject = memberJoinCopy(params.language).subject(params.churchName);
  const html = buildMemberJoinEmailHtml({
    churchName: params.churchName,
    churchCode: params.churchCode,
    joinUrl: params.joinUrl,
    qrDataUrl: params.qrDataUrl,
    language: params.language,
  });
  const text = buildMemberJoinEmailText({
    churchName: params.churchName,
    churchCode: params.churchCode,
    joinUrl: params.joinUrl,
    language: params.language,
  });

  if (!apiKey) {
    console.info('[member-join-email] RESEND_API_KEY not set — would send to', params.to);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed: ${body.slice(0, 200)}`);
  }
}
