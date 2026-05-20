type SendInviteEmailParams = {
  to: string;
  churchName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
};

function adminBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export function buildInviteAcceptUrl(rawToken: string): string {
  return `${adminBaseUrl()}/invite/${encodeURIComponent(rawToken)}`;
}

/**
 * Sends invite email via Resend when RESEND_API_KEY is set.
 * Falls back to console log in development.
 */
export async function sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_EMAIL_FROM?.trim() ?? 'Sermon Recall <onboarding@resend.dev>';

  const subject = `You're invited to ${params.churchName} on Sermon Recall`;
  const html = `
    <p>Hi,</p>
    <p>${params.inviterName} invited you to join <strong>${params.churchName}</strong> as <strong>${params.role.replace(/_/g, ' ')}</strong>.</p>
    <p><a href="${params.acceptUrl}">Accept invitation</a></p>
    <p>This link expires in 7 days. If you did not expect this, you can ignore this email.</p>
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

export { adminBaseUrl };
