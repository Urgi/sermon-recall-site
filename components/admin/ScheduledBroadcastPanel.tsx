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
  status: string;
  audience_type: string;
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
  const [audienceType, setAudienceType] = useState<'all_members' | 'pastors_only'>('all_members');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const sb = createBrowserSupabaseClient();
    const { data, error: qErr } = await sb
      .from('scheduled_church_notifications')
      .select('id, title, body, send_at, sent_at, status, audience_type')
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
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}`;
    const res = await fetch('/api/church/schedule-broadcast', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        sendAt: d.toISOString(),
        audienceType,
        idempotencyKey,
      }),
    });
    const data = (await res.json()) as { error?: string };
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
    const { error: upErr } = await sb
      .from('scheduled_church_notifications')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    void load();
  }

  const upcoming = rows.filter((r) => r.status === 'scheduled' || r.status === 'draft');

  return (
    <div className="space-y-6">
      <form onSubmit={onSchedule} className="space-y-4">
        <h3 className="admin-section-title">Schedule a notification</h3>
        <p className="admin-hint">
          Local date/time converted to UTC. Due messages send every 15 minutes via cron.
        </p>
        <div>
          <label className="admin-label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            required
            className="admin-input mt-1"
          />
        </div>
        <div>
          <label className="admin-label">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={320}
            required
            rows={3}
            className="admin-input mt-1 resize-y"
          />
        </div>
        <div>
          <label className="admin-label">Audience</label>
          <select
            value={audienceType}
            onChange={(e) => setAudienceType(e.target.value as 'all_members' | 'pastors_only')}
            className="admin-input mt-1"
          >
            <option value="all_members">All members</option>
            <option value="pastors_only">Pastors / staff</option>
          </select>
        </div>
        <div>
          <label className="admin-label">Send at (local)</label>
          <input
            type="datetime-local"
            value={sendLocal}
            onChange={(e) => setSendLocal(e.target.value)}
            required
            className="admin-input mt-1 max-w-xs"
          />
        </div>
        {title && body ? (
          <div className="admin-card-nested p-4">
            <p className="admin-hint text-xs font-semibold uppercase">Preview</p>
            <p className="mt-2 font-semibold text-admin-fg-strong">{title}</p>
            <p className="admin-body mt-1">{body}</p>
          </div>
        ) : null}
        {error ? (
          <p className="text-[13px] text-red-500" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-[13px] text-emerald-600" role="status">
            {success}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="admin-btn-secondary">
          {pending ? 'Saving…' : 'Schedule send'}
        </button>
      </form>

      {upcoming.length > 0 ? (
        <div>
          <h4 className="admin-section-title text-sm">Upcoming</h4>
          <ul className="mt-2 space-y-2">
            {upcoming.map((r) => (
              <li key={r.id} className="admin-card-nested flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-[13px]">
                <div>
                  <p className="font-medium text-admin-fg-strong">{r.title}</p>
                  <p className="admin-hint">{formatLocal(r.send_at)} · {r.audience_type.replace(/_/g, ' ')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void cancel(r.id)}
                  className="shrink-0 text-[12px] font-medium text-red-500 hover:underline"
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
