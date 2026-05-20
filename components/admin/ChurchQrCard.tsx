'use client';

import { useMemo, useState } from 'react';

import {
  buildMemberJoinEmailHtml,
  buildMemberJoinEmailText,
  normalizeChurchCode,
} from '@/lib/church/member-join';

type Props = {
  churchName: string;
  churchCode: string;
  joinUrl: string;
  qrDataUrl: string;
};

export function ChurchQrCard({ churchName, churchCode, joinUrl, qrDataUrl }: Props) {
  const code = normalizeChurchCode(churchCode);
  const downloadName = useMemo(
    () => `sermon-recall-${code.replace(/[^a-zA-Z0-9_-]/g, '_')}-qr.png`,
    [code],
  );

  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailPending, setEmailPending] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  function flash(message: string) {
    setCopyNotice(message);
    window.setTimeout(() => setCopyNotice(null), 3500);
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied.`);
    } catch {
      flash('Could not copy — select and copy manually.');
    }
  }

  function downloadPng() {
    const anchor = document.createElement('a');
    anchor.href = qrDataUrl;
    anchor.download = downloadName;
    anchor.click();
    flash('QR image download started.');
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailNotice(null);
    const to = emailTo.trim();
    if (!to) {
      setEmailNotice('Enter an email address.');
      return;
    }
    setEmailPending(true);
    try {
      const res = await fetch('/api/church/member-share-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setEmailNotice(json.error ?? 'Could not send email.');
        return;
      }
      setEmailNotice(json.message ?? 'Sent.');
      setEmailTo('');
    } catch {
      setEmailNotice('Network error. Try again.');
    } finally {
      setEmailPending(false);
    }
  }

  const emailHtml = buildMemberJoinEmailHtml({
    churchName,
    churchCode: code,
    joinUrl,
    qrDataUrl,
  });
  const emailText = buildMemberJoinEmailText({
    churchName,
    churchCode: code,
    joinUrl,
  });

  return (
    <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="shrink-0 rounded-xl border border-admin bg-white p-3 dark:bg-[#f8fafc]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`QR code to join ${churchName}`}
          width={240}
          height={240}
          className="block h-[240px] w-[240px]"
        />
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <p className="admin-body text-[14px] leading-relaxed">
          Members scan this code or open the link, then sign in on the Sermon Recall app and enter
          code <span className="font-mono font-semibold text-admin-fg-strong">{code}</span>.
        </p>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadPng} className="admin-btn-secondary text-[13px]">
            Download PNG
          </button>
          <a
            href="/api/church/qr-image"
            className="admin-btn-secondary inline-flex items-center text-[13px] no-underline"
            download
          >
            High-res PNG
          </a>
          <button
            type="button"
            onClick={() => copyText('Join link', joinUrl)}
            className="admin-btn-secondary text-[13px]"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={() => copyText('Church code', code)}
            className="admin-btn-secondary text-[13px]"
          >
            Copy code
          </button>
          <button
            type="button"
            onClick={() => copyText('Email HTML', emailHtml)}
            className="admin-btn-secondary text-[13px]"
          >
            Copy email HTML
          </button>
          <button
            type="button"
            onClick={() => copyText('Plain email text', emailText)}
            className="admin-btn-secondary text-[13px]"
          >
            Copy email text
          </button>
        </div>

        <p className="admin-hint break-all font-mono text-[12px]">{joinUrl}</p>

        {copyNotice ? (
          <p className="text-[13px] text-emerald-600 dark:text-emerald-400" role="status">
            {copyNotice}
          </p>
        ) : null}

        <form onSubmit={sendEmail} className="space-y-2 border-t border-admin pt-4">
          <p className="admin-hint text-[13px] font-medium uppercase tracking-wide">
            Email join instructions
          </p>
          <p className="admin-body text-[13px]">
            Sends an email with the QR image and steps (uses Resend when configured).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="email"
              name="to"
              placeholder="member@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="admin-input min-w-0 flex-1 font-sans normal-case"
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={emailPending}
              className="admin-btn-primary shrink-0 disabled:opacity-60"
            >
              {emailPending ? 'Sending…' : 'Send email'}
            </button>
          </div>
          {emailNotice ? (
            <p
              className={`text-[13px] ${emailNotice.includes('sent') || emailNotice.includes('logged') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
              role="status"
            >
              {emailNotice}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
