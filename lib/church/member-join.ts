/** Base URL for member join links (QR codes, emails). Defaults to admin/site URL. */
export function memberJoinBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_MEMBER_JOIN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/$/, '');

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

export function normalizeChurchCode(code: string): string {
  return code.trim().toUpperCase();
}

export function buildMemberJoinUrl(churchCode: string): string {
  const code = normalizeChurchCode(churchCode);
  return `${memberJoinBaseUrl()}/join/${encodeURIComponent(code)}`;
}

export function buildMemberJoinEmailHtml(params: {
  churchName: string;
  churchCode: string;
  joinUrl: string;
  qrDataUrl: string;
}): string {
  const code = normalizeChurchCode(params.churchCode);
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 32rem; color: #0f172a;">
      <p>Join <strong>${escapeHtml(params.churchName)}</strong> on Sermon Recall.</p>
      <p style="font-size: 15px; line-height: 1.5;">
        1. Install the Sermon Recall app on your phone.<br />
        2. Sign in with your phone number.<br />
        3. Enter church code <strong style="font-family: ui-monospace, monospace;">${escapeHtml(code)}</strong>
        or scan the QR code below.
      </p>
      <p style="text-align: center; margin: 24px 0;">
        <img src="${params.qrDataUrl}" alt="QR code to join ${escapeHtml(params.churchName)}" width="240" height="240" style="display: inline-block; border: 1px solid #e2e8f0; border-radius: 8px;" />
      </p>
      <p style="font-size: 14px;">
        <a href="${params.joinUrl}" style="color: #0284c7;">${escapeHtml(params.joinUrl)}</a>
      </p>
      <p style="font-size: 13px; color: #64748b;">Questions? Contact your pastor.</p>
    </div>
  `.trim();
}

export function buildMemberJoinEmailText(params: {
  churchName: string;
  churchCode: string;
  joinUrl: string;
}): string {
  const code = normalizeChurchCode(params.churchCode);
  return [
    `Join ${params.churchName} on Sermon Recall`,
    '',
    '1. Install the Sermon Recall app on your phone.',
    '2. Sign in with your phone number.',
    `3. Enter church code: ${code}`,
    '',
    `Or open this link: ${params.joinUrl}`,
    '',
    'Your pastor can also send a QR image you can scan from your camera app.',
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
