import { YOUTUBE_OPS_ALERT_EMAIL } from '@/lib/transcription/youtube-failure';

type YoutubeFailureAlert = {
  code: string;
  jobId: string;
  sermonId: string;
  sermonTitle?: string | null;
  sourceUrl?: string | null;
  churchId?: string | null;
  error: string;
};

function opsAlertEmail(): string {
  return process.env.YOUTUBE_OPS_ALERT_EMAIL?.trim() || YOUTUBE_OPS_ALERT_EMAIL;
}

/**
 * Email ops when YouTube ingest fails so cookies can be rotated.
 * Never throws — job failure handling must continue even if mail fails.
 */
export async function sendYoutubeIngestFailureEmail(alert: YoutubeFailureAlert): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITE_EMAIL_FROM?.trim() ?? 'Sermon Recall <onboarding@resend.dev>';
  const to = opsAlertEmail();
  const subject = `YouTube ingest failed [${alert.code}]`;
  const html = `
    <p>YouTube ingest failed. Refresh <code>YT_DLP_COOKIES_BASE64</code> on the Railway worker if this looks like a bot/cookie block.</p>
    <p><strong>Error code:</strong> ${escapeHtml(alert.code)}</p>
    <p><strong>Job:</strong> ${escapeHtml(alert.jobId)}<br/>
    <strong>Sermon:</strong> ${escapeHtml(alert.sermonId)}${alert.sermonTitle ? ` — ${escapeHtml(alert.sermonTitle)}` : ''}<br/>
    ${alert.churchId ? `<strong>Church:</strong> ${escapeHtml(alert.churchId)}<br/>` : ''}
    ${alert.sourceUrl ? `<strong>URL:</strong> ${escapeHtml(alert.sourceUrl)}<br/>` : ''}
    </p>
    <pre style="white-space:pre-wrap;font-size:13px;background:#f4f4f5;padding:12px;border-radius:8px;">${escapeHtml(alert.error)}</pre>
  `.trim();

  if (!apiKey) {
    console.info(`[youtube-ops-alert] RESEND_API_KEY not set — ${subject}`, alert.error);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[youtube-ops-alert] send failed:', text.slice(0, 300));
    }
  } catch (e) {
    console.error('[youtube-ops-alert] send failed:', e);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
