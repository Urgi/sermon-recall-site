import { memberJoinCopy } from '@/lib/email/email-copy';
import { GOOGLE_PLAY_URL } from '@/lib/public-site/config';
import { siteOrigin } from '@/lib/site-origin';

/** Base URL for member join links (QR codes, emails). Defaults to admin/site URL. */
export function memberJoinBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_MEMBER_JOIN_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  return siteOrigin();
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
  language?: string | null;
}): string {
  const code = normalizeChurchCode(params.churchCode);
  const c = memberJoinCopy(params.language);
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 32rem; color: #0f172a;">
      <p>${c.intro(`<strong>${escapeHtml(params.churchName)}</strong>`)}</p>
      <p style="font-size: 15px; line-height: 1.5;">
        ${c.step1Html(`<a href="${GOOGLE_PLAY_URL}" style="color: #0284c7;">Google Play</a>`)}<br />
        ${c.step2}<br />
        ${c.step3Html(`<strong style="font-family: ui-monospace, monospace;">${escapeHtml(code)}</strong>`)}
      </p>
      <p style="text-align: center; margin: 24px 0;">
        <img src="${params.qrDataUrl}" alt="${escapeHtml(c.qrAlt(params.churchName))}" width="240" height="240" style="display: inline-block; border: 1px solid #e2e8f0; border-radius: 8px;" />
      </p>
      <p style="font-size: 14px;">
        <a href="${params.joinUrl}" style="color: #0284c7;">${escapeHtml(params.joinUrl)}</a>
      </p>
      <p style="font-size: 13px; color: #64748b;">${c.questions}</p>
    </div>
  `.trim();
}

export function buildMemberJoinEmailText(params: {
  churchName: string;
  churchCode: string;
  joinUrl: string;
  language?: string | null;
}): string {
  const code = normalizeChurchCode(params.churchCode);
  const c = memberJoinCopy(params.language);
  return [
    c.introText(params.churchName),
    '',
    c.step1Text(GOOGLE_PLAY_URL),
    c.step2,
    c.step3Text(code),
    '',
    `${c.openLink} ${params.joinUrl}`,
    '',
    c.qrNote,
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
