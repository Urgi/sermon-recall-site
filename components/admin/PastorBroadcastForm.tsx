'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PastorBroadcastForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pushWarnings, setPushWarnings] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPushWarnings(null);
    setPending(true);
    try {
      const res = await fetch('/api/church/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        recipientCount?: number;
        warning?: string;
        pushTicketErrors?: string[];
      };
      setPending(false);
      if (!res.ok) {
        setError(data.error ?? 'Could not send.');
        return;
      }
      const n = data.recipientCount ?? 0;
      setPushWarnings(
        data.pushTicketErrors && data.pushTicketErrors.length > 0 ? data.pushTicketErrors : null,
      );
      setSuccess(
        data.warning ?? `Sent to ${n} device${n === 1 ? '' : 's'} (handed off to Expo).`,
      );
      setTitle('');
      setBody('');
      router.refresh();
    } catch {
      setPending(false);
      setError('Network error.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="broadcast-title" className="block text-[13px] font-medium text-[#94a3b8]">
          Title <span className="text-[#64748b]">(max 80 characters)</span>
        </label>
        <input
          id="broadcast-title"
          name="title"
          type="text"
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Womens retreat signup closes Friday"
          className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      <div>
        <label htmlFor="broadcast-body" className="block text-[13px] font-medium text-[#94a3b8]">
          Message <span className="text-[#64748b]">(max 320 characters)</span>
        </label>
        <textarea
          id="broadcast-body"
          name="body"
          required
          rows={4}
          maxLength={320}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Short message shown on members’ phones."
          className="mt-1 w-full resize-y rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
        />
      </div>
      {error ? (
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-[13px] text-emerald-400" role="status">
          {success}
        </p>
      ) : null}
      {pushWarnings?.length ? (
        <p className="text-[13px] text-amber-300" role="status">
          Expo push could not deliver to this token/device: {pushWarnings.join('; ')}. Typical
          fixes: reinstall app and open once (fresh token), confirm phone notifications are on, and
          verify the member uses the same Supabase project as this site.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[#0ea5e9] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send notification'}
      </button>
    </form>
  );
}
