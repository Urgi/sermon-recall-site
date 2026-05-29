'use client';

import { useMemo, useState } from 'react';

import { normalizeChurchCode } from '@/lib/church/member-join';

type Props = {
  churchName: string;
  churchCode: string;
  joinUrl: string;
  qrDataUrl: string;
  /** When true, only share tools (QR shown elsewhere on the page). */
  toolsOnly?: boolean;
};

export function ChurchQrCard({
  churchName,
  churchCode,
  joinUrl,
  qrDataUrl,
  toolsOnly = false,
}: Props) {
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

  return (
    <div
      className={
        toolsOnly
          ? 'mt-4 space-y-4'
          : 'mt-4 flex flex-col gap-6 sm:flex-row sm:items-start'
      }
    >
      {!toolsOnly ? (
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
      ) : null}

      <div className={toolsOnly ? 'space-y-4' : 'min-w-0 flex-1 space-y-4'}>
        <p className="admin-body text-[14px] leading-relaxed">
          Members scan this code or open the link, then sign in on the Sermon Recall app and enter
          code <span className="font-mono font-semibold text-admin-fg-strong">{code}</span>.
        </p>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadPng} className="admin-btn-secondary text-[13px]">
            Download PNG
          </button>
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
        </div>

        {copyNotice ? (
          <p className="text-[13px] text-emerald-600 dark:text-emerald-400" role="status">
            {copyNotice}
          </p>
        ) : null}

        <form onSubmit={sendEmail} className="space-y-2 border-t border-admin pt-4">
          <p className="admin-hint text-[13px] font-medium uppercase tracking-wide">
            Email join instructions
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
