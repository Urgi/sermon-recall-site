import { inviteCopy, inviteRoleName } from '@/lib/email/email-copy';
import { siteOrigin } from '@/lib/site-origin';

type SendInviteEmailParams = {
  to: string;
  churchName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  /** Church language (en, es, fr). */
  language?: string | null;
};

export function buildInviteAcceptUrl(rawToken: string): string {
  return `${siteOrigin()}/invite/${encodeURIComponent(rawToken)}`;
}

/**
 * Sends invite email via Resend when RESEND_API_KEY is set.
 * Falls back to console log in development.
 */
export async function sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_EMAIL_FROM?.trim() ?? 'Sermon Recall <onboarding@resend.dev>';

  const copy = inviteCopy(params.language);
  const subject = copy.subject(params.churchName);
  const html = `
    <p>${copy.hi}</p>
    <p>${copy.bodyHtml(params.inviterName, params.churchName, inviteRoleName(params.language, params.role))}</p>
    <p><a href="${params.acceptUrl}">${copy.accept}</a></p>
    <p>${copy.expiry}</p>
  `.trim();

  if (!apiKey) {
    console.info('[invite-email] RESEND_API_KEY not set — invite link:', params.acceptUrl);
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
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email send failed: ${text.slice(0, 200)}`);
  }
}
