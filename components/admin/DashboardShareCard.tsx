'use client';

import { useMemo, useState } from 'react';

import { normalizeChurchCode } from '@/lib/church/member-join';

type Props = {
  churchName: string;
  churchCode: string;
  joinUrl: string;
  qrDataUrl: string;
  heading?: string;
  hint?: string;
  size?: 'sm' | 'lg';
  showEmail?: boolean;
};

export function DashboardShareCard({
  churchName,
  churchCode,
  joinUrl,
  qrDataUrl,
  heading = 'Share with members',
  hint = 'Church code they enter in the app, or scan the QR. You can also email a join link.',
  size = 'sm',
  showEmail = true,
}: Props) {
  const code = normalizeChurchCode(churchCode);
  const downloadName = useMemo(
    () => `sermon-recall-${code.replace(/[^a-zA-Z0-9_-]/g, '_')}-qr.png`,
    [code],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailPending, setEmailPending] = useState(false);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2800);
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied.`);
    } catch {
      flash('Could not copy.');
    }
  }

  function downloadPng() {
    const href =
      qrDataUrl.startsWith('/') || qrDataUrl.startsWith('http')
        ? `${qrDataUrl}${qrDataUrl.includes('?') ? '&' : '?'}download=1`
        : qrDataUrl;
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = downloadName;
    anchor.click();
    flash('QR download started.');
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    const to = emailTo.trim();
    if (!to) return;
    setEmailPending(true);
    try {
      const res = await fetch('/api/church/member-share-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        flash(json.error ?? 'Could not send email.');
        return;
      }
      flash(json.message ?? 'Sent.');
      setEmailTo('');
    } catch {
      flash('Network error.');
    } finally {
      setEmailPending(false);
    }
  }

  return (
    <div className="admin-card flex h-full flex-col p-5">
      <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">{heading}</h2>
      <p className="mt-1 text-[13px] text-[var(--admin-muted)]">{hint}</p>
      <div className="mt-4 flex gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-surface-bg)] px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[var(--admin-muted)]">Church code</p>
              <p
                className={`mt-1 truncate font-mono font-bold tracking-wide text-[var(--admin-fg-strong)] ${
                  size === 'lg' ? 'text-[1.5rem] leading-none' : 'text-lg'
                }`}
              >
                {code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copy('Church code', code)}
              aria-label="Copy church code"
              className="mt-0.5 shrink-0 rounded-md p-1 text-[var(--admin-link)] hover:bg-admin-nav-hover"
            >
              <CopyIcon />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void copy('Join link', joinUrl)}
              className="admin-btn-secondary flex min-w-0 flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[13px]"
            >
              <LinkIcon />
              Copy link
            </button>
            <button
              type="button"
              onClick={downloadPng}
              className="admin-btn-secondary flex min-w-0 flex-1 items-center justify-center gap-1.5 px-3 py-2 text-[13px]"
            >
              <DownloadIcon />
              Download QR
            </button>
          </div>
          {notice ? (
            <p className="text-[12px] text-emerald-500" role="status">
              {notice}
            </p>
          ) : null}
          {showEmail ? (
          <form onSubmit={(e) => void sendEmail(e)} className="flex gap-2">
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="Email a member"
              className="admin-input min-w-0 flex-1 py-1.5 text-[13px]"
            />
            <button
              type="submit"
              disabled={emailPending || !emailTo.trim()}
              className="admin-btn-secondary shrink-0 px-3 text-[13px]"
            >
              {emailPending ? '…' : 'Send'}
            </button>
          </form>
          ) : null}
        </div>
        <div className="shrink-0 text-center">
          <div className="rounded-lg border border-admin bg-white p-1.5 dark:bg-[#f8fafc]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR code to join ${churchName}`}
              width={size === 'lg' ? 140 : 88}
              height={size === 'lg' ? 140 : 88}
              className={size === 'lg' ? 'block h-[140px] w-[140px]' : 'block h-[88px] w-[88px]'}
            />
          </div>
          <p className="admin-hint mt-1.5 text-[11px]">Scan to join</p>
        </div>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93M14 11a5 5 0 0 0-7.07 0L5.52 12.41a5 5 0 0 0 7.07 7.07L14 18.07"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M12 4v12M8 12l4 4 4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
