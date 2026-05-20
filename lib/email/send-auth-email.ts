type SendSignupConfirmParams = {
  to: string;
  confirmUrl: string;
};

/**
 * Sends pastor/member signup confirmation via Resend (same stack as team invites).
 */
export async function sendSignupConfirmationEmail(
  params: SendSignupConfirmParams,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.INVITE_EMAIL_FROM?.trim() ?? 'Sermon Recall <onboarding@resend.dev>';

  const subject = 'Sign in to Sermon Recall — confirm your email';
  const html = `
    <p>Hi,</p>
    <p>Use this link to confirm your email and sign in to Sermon Recall.</p>
    <p><a href="${params.confirmUrl}">Confirm email and continue</a></p>
    <p><strong>Pastors:</strong> open this link in <strong>Chrome or Safari</strong> (choose <em>Stay in browser</em> if asked to open the member app).</p>
    <p>This link expires in about an hour. If you did not sign up, you can ignore this email.</p>
  `.trim();

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured on the server.');
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
    throw new Error(`Confirmation email failed: ${text.slice(0, 200)}`);
  }
}
