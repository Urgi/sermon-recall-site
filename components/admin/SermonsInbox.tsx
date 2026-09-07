'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { PastorLifecycle } from '@/lib/admin/workflow-status';
import { pastorLifecycleBadgeClass, pastorLifecycleLabel } from '@/lib/admin/workflow-status';

export type SermonsInboxRow = {
  id: string;
  title: string;
  sermon_date: string | null;
  pastor_name: string | null;
  lifecycle: PastorLifecycle;
};

type FilterId = 'all' | 'review_needed' | 'processing' | 'failed' | 'published';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'review_needed', label: 'Review needed' },
  { id: 'processing', label: 'Processing' },
  { id: 'failed', label: 'Failed' },
  { id: 'published', label: 'Published' },
];

function countFor(rows: SermonsInboxRow[], id: FilterId): number {
  if (id === 'all') return rows.length;
  return rows.filter((r) => r.lifecycle === id).length;
}

function initialFilter(rows: SermonsInboxRow[]): FilterId {
  if (countFor(rows, 'review_needed') > 0) return 'review_needed';
  if (countFor(rows, 'processing') > 0) return 'processing';
  if (countFor(rows, 'failed') > 0) return 'failed';
  return 'all';
}

function filterHint(id: FilterId): string | null {
  switch (id) {
    case 'review_needed':
      return 'Devotionals are drafted. Open them before they go live.';
    case 'processing':
      return 'Transcription or generation is in progress. This usually finishes on its own.';
    case 'failed':
      return 'Retry the transcript or upload a different source.';
    default:
      return null;
  }
}

export function SermonsInbox({ rows }: { rows: SermonsInboxRow[] }) {
  const [filter, setFilter] = useState<FilterId>(() => initialFilter(rows));
  const shown = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.lifecycle === filter)),
    [filter, rows],
  );
  const needsCount =
    countFor(rows, 'review_needed') + countFor(rows, 'processing') + countFor(rows, 'failed');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = countFor(rows, f.id);
          const selected = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-medium ${
                selected
                  ? 'border-[var(--admin-fg-strong)] bg-[var(--admin-fg-strong)] text-[var(--admin-card-bg)]'
                  : 'border-[var(--admin-border-strong)] text-[var(--admin-fg-secondary)] hover:text-[var(--admin-fg-strong)]'
              }`}
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-80">{n}</span>
            </button>
          );
        })}
      </div>
      {filterHint(filter) ? (
        <p className="admin-hint">{filterHint(filter)}</p>
      ) : needsCount > 0 && filter === 'all' ? (
        <p className="admin-hint">
          {needsCount} {needsCount === 1 ? 'sermon needs' : 'sermons need'} attention. Filter to
          review, processing, or failed.
        </p>
      ) : null}

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center">
          <p className="admin-body">No sermons in this view.</p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-admin bg-admin-surface text-[12px] font-semibold uppercase tracking-wide text-admin-dim">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="hidden px-4 py-3 sm:table-cell">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {shown.map((s) => (
                <tr key={s.id} className="hover:bg-admin-nav-hover/50">
                  <td className="px-4 py-3">
                    <Link href={`/sermons/${s.id}`} className="font-medium text-admin-link hover:underline">
                      {s.title}
                    </Link>
                    {s.pastor_name ? <p className="admin-hint mt-0.5">{s.pastor_name}</p> : null}
                  </td>
                  <td className="admin-body hidden px-4 py-3 sm:table-cell">{s.sermon_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={pastorLifecycleBadgeClass(s.lifecycle)}>
                      {pastorLifecycleLabel(s.lifecycle)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
