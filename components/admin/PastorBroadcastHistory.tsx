'use client';

import { useCallback, useEffect, useState } from 'react';

import type { BroadcastHistoryItem } from '@/app/api/church/broadcast-history/route';
import type { BroadcastRecipientRow } from '@/app/api/church/broadcast/[id]/recipients/route';
import type { StaffRole } from '@/lib/auth/permissions';
import { formatTargetStaffRoles } from '@/lib/push/broadcast-audience';

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

function formatRole(role: string | null): string {
  if (!role) return '—';
  return role.replace(/_/g, ' ');
}

type Props = {
  refreshKey?: number;
};

export function PastorBroadcastHistory({ refreshKey = 0 }: Props) {
  const [items, setItems] = useState<BroadcastHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recipientsById, setRecipientsById] = useState<
    Record<string, { loading: boolean; rows: BroadcastRecipientRow[]; error?: string }>
  >({});

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

  async function loadRecipients(broadcastId: string) {
    setRecipientsById((prev) => ({
      ...prev,
      [broadcastId]: { loading: true, rows: prev[broadcastId]?.rows ?? [] },
    }));
    try {
      const res = await fetch(`/api/church/broadcast/${broadcastId}/recipients`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = (await res.json()) as {
        error?: string;
        recipients?: BroadcastRecipientRow[];
      };
      if (!res.ok) {
        setRecipientsById((prev) => ({
          ...prev,
          [broadcastId]: { loading: false, rows: [], error: data.error ?? 'Failed to load' },
        }));
        return;
      }
      setRecipientsById((prev) => ({
        ...prev,
        [broadcastId]: { loading: false, rows: data.recipients ?? [] },
      }));
    } catch {
      setRecipientsById((prev) => ({
        ...prev,
        [broadcastId]: { loading: false, rows: [], error: 'Network error' },
      }));
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!recipientsById[id]) {
      void loadRecipients(id);
    }
  }

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
          className="text-[13px] font-medium text-admin-link hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!items?.length) {
    return (
      <p className="text-[14px] leading-relaxed text-admin-dim">
        No notifications sent yet. When you send one, it appears here with who opened the full
        message in the app.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const expanded = expandedId === item.id;
        const recState = recipientsById[item.id];
        const audienceLabel = [
          item.target_staff_roles?.length
            ? formatTargetStaffRoles(item.target_staff_roles as StaffRole[])
            : null,
          item.include_all_members ? 'all members' : null,
        ]
          .filter(Boolean)
          .join(' · ');

        return (
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
              {item.recipient_count} recipient{item.recipient_count === 1 ? '' : 's'}
              {item.opened_count > 0 ? (
                <>
                  {' '}
                  ·{' '}
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {item.opened_count} opened full message
                  </span>
                </>
              ) : (
                ' · no opens yet'
              )}
              {audienceLabel ? (
                <>
                  {' '}
                  · To: <span className="text-admin-muted">{audienceLabel}</span>
                </>
              ) : null}
              {item.sender_name ? (
                <>
                  {' '}
                  · by <span className="text-admin-muted">{item.sender_name}</span>
                </>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => toggleExpand(item.id)}
              className="mt-2 text-[13px] font-medium text-admin-link hover:underline"
            >
              {expanded ? 'Hide who opened' : 'See who opened'}
            </button>
            {expanded ? (
              <div className="mt-3 border-t border-admin pt-3">
                {recState?.loading ? (
                  <p className="text-[13px] text-admin-dim">Loading recipients…</p>
                ) : recState?.error ? (
                  <p className="text-[13px] text-red-500">{recState.error}</p>
                ) : recState?.rows.length ? (
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="text-admin-dim">
                        <th className="pb-2 pr-3 font-medium">Name</th>
                        <th className="pb-2 pr-3 font-medium">Role</th>
                        <th className="pb-2 font-medium">Opened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recState.rows.map((r) => (
                        <tr key={r.user_id} className="border-t border-admin/60 text-admin-fg-secondary">
                          <td className="py-2 pr-3">
                            {r.full_name ?? r.user_id.slice(0, 8)}
                            {!r.has_push ? (
                              <span className="admin-hint ml-1 text-[11px]">(no push)</span>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3">{formatRole(r.staff_role)}</td>
                          <td className="py-2">
                            {r.opened_at ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Yes · {formatSentAt(r.opened_at)}
                              </span>
                            ) : (
                              <span className="text-admin-dim">Not yet</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-[13px] text-admin-dim">
                    No per-person tracking for this send (older notification).
                  </p>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
