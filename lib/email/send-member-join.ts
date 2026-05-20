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
};

export async function sendMemberJoinEmail(params: SendMemberJoinEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_EMAIL_FROM?.trim() ?? 'Sermon Recall <onboarding@resend.dev>';

  const subject = `Join ${params.churchName} on Sermon Recall`;
  const html = buildMemberJoinEmailHtml({
    churchName: params.churchName,
    churchCode: params.churchCode,
    joinUrl: params.joinUrl,
    qrDataUrl: params.qrDataUrl,
  });
  const text = buildMemberJoinEmailText({
    churchName: params.churchName,
    churchCode: params.churchCode,
    joinUrl: params.joinUrl,
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
