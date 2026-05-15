'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Row = {
  id: string;
  title: string;
  body: string;
  send_at: string;
  sent_at: string | null;
};

function formatLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function ScheduledBroadcastPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendLocal, setSendLocal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const sb = createBrowserSupabaseClient();
    const { data, error: qErr } = await sb
      .from('scheduled_church_notifications')
      .select('id, title, body, send_at, sent_at')
      .order('send_at', { ascending: true });
    if (qErr) {
      console.warn('[scheduled]', qErr.message);
      setRows([]);
      return;
    }
    setRows((data as Row[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSchedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!sendLocal) {
      setError('Pick a date and time.');
      return;
    }
    const d = new Date(sendLocal);
    if (Number.isNaN(d.getTime())) {
      setError('Invalid date.');
      return;
    }
    setPending(true);
    const res = await fetch('/api/church/schedule-broadcast', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        sendAt: d.toISOString(),
      }),
    });
    const data = (await res.json()) as { error?: string; ok?: boolean };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not schedule.');
      return;
    }
    setSuccess('Scheduled.');
    setTitle('');
    setBody('');
    setSendLocal('');
    router.refresh();
    void load();
  }

  async function cancel(id: string) {
    const sb = createBrowserSupabaseClient();
    const { error: delErr } = await sb.from('scheduled_church_notifications').delete().eq('id', id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    void load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSchedule} className="space-y-4">
        <h3 className="text-[15px] font-semibold text-white">Schedule a notification</h3>
        <p className="text-[13px] text-[#94a3b8]">
          Uses your browser&apos;s local date and time; stored in UTC and sent when due (cron on the
          host must run <code className="text-[12px] text-sky-200">/api/cron/scheduled-broadcasts</code>
          ).
        </p>
        <div>
          <label className="block text-[13px] font-medium text-[#94a3b8]">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            required
            className="mt-1 w-full rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none focus:border-[#38bdf8]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#94a3b8]">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={320}
            required
            rows={3}
            className="mt-1 w-full resize-y rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none focus:border-[#38bdf8]"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#94a3b8]">Send at (local)</label>
          <input
            type="datetime-local"
            value={sendLocal}
            onChange={(e) => setSendLocal(e.target.value)}
            required
            className="mt-1 w-full max-w-xs rounded-lg border border-[rgba(56,189,248,0.2)] bg-[#05070a] px-3 py-2 text-[15px] text-white outline-none focus:border-[#38bdf8]"
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
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-sky-500/40 bg-[#0a0f18] px-4 py-2 text-[14px] font-semibold text-sky-200 hover:bg-[#0f172a] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Schedule send'}
        </button>
      </form>

      {rows.filter((r) => !r.sent_at).length > 0 ? (
        <div>
          <h4 className="text-[14px] font-semibold text-[#cbd5e1]">Upcoming</h4>
          <ul className="mt-2 space-y-2">
            {rows
              .filter((r) => !r.sent_at)
              .map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#1e293b] bg-[#020617]/50 px-3 py-2 text-[13px]"
                >
                  <div>
                    <p className="font-medium text-white">{r.title}</p>
                    <p className="text-[#94a3b8]">{formatLocal(r.send_at)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void cancel(r.id)}
                    className="shrink-0 text-[12px] font-medium text-rose-300 hover:underline"
                  >
                    Cancel
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
