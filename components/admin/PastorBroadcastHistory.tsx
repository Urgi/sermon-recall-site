'use client';

import { useCallback, useEffect, useState } from 'react';

import type { BroadcastHistoryItem } from '@/app/api/church/broadcast-history/route';

function formatSentAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  /** Re-fetch when this changes (e.g. after sending from the form on the same page). */
  refreshKey?: number;
};

export function PastorBroadcastHistory({ refreshKey = 0 }: Props) {
  const [items, setItems] = useState<BroadcastHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/church/broadcast-history', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: BroadcastHistoryItem[];
      };
      if (!res.ok) {
        setError(data.error ?? 'Could not load history.');
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError('Network error.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <p className="text-[14px] text-admin-dim" role="status">
        Loading notification history…
      </p>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-[13px] text-red-400" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-[13px] font-medium text-[#38bdf8] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <p className="text-[14px] leading-relaxed text-admin-dim">
        No custom notifications sent yet. When you use{' '}
        <span className="text-admin-muted">Send notification</span> on the dashboard, they appear
        here with delivery counts.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-admin bg-admin-surface px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[15px] font-semibold text-admin-fg-strong">{item.title}</p>
            <time
              dateTime={item.created_at}
              className="shrink-0 text-[12px] tabular-nums text-admin-dim"
            >
              {formatSentAt(item.created_at)}
            </time>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-admin-fg-secondary whitespace-pre-wrap">
            {item.body}
          </p>
          <p className="mt-2 text-[12px] text-admin-dim">
            Sent to{' '}
            <span className="font-medium text-admin-muted">
              {item.recipient_count} device{item.recipient_count === 1 ? '' : 's'}
            </span>
            {item.sender_name ? (
              <>
                {' '}
                · by <span className="text-admin-muted">{item.sender_name}</span>
              </>
            ) : null}
          </p>
        </li>
      ))}
    </ul>
  );
}
