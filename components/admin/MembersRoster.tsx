'use client';

import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ModalShell } from '@/components/admin/ModalShell';
import type { ChurchMemberRow } from '@/lib/admin/church-members';

type Props = {
  members: ChurchMemberRow[];
  /** Owner / admin pastor: show the Remove action. */
  canRemove?: boolean;
};

function displayName(row: ChurchMemberRow): string {
  return row.full_name?.trim() || row.email || row.phone_number || 'Member';
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

function contactLine(row: ChurchMemberRow): string {
  return [row.email, row.phone_number].filter(Boolean).join(' · ') || '—';
}

function matchesQuery(row: ChurchMemberRow, q: string): boolean {
  if (!q) return true;
  const hay = [row.full_name, row.email, row.phone_number].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

export function MembersRoster({ members, canRemove = false }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [removeTarget, setRemoveTarget] = useState<ChurchMemberRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const q = query.trim().toLowerCase();

  async function confirmRemove() {
    const target = removeTarget;
    if (!target) return;
    setRemoving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/church/remove-member', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: target.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not remove member.');
      setNotice({ kind: 'ok', text: `${displayName(target)} was removed from your church.` });
      setRemoveTarget(null);
      router.refresh();
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not remove member.' });
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  }

  const shown = useMemo(
    () => members.filter((m) => matchesQuery(m, q)),
    [members, q],
  );

  return (
    <div className="space-y-4">
      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={notice.kind === 'error' ? 'text-[14px] text-red-500' : 'admin-body text-[14px]'}
        >
          {notice.text}
        </p>
      )}
      <label className="relative block max-w-md">
        <span className="sr-only">Search members</span>
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members"
          className="w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-surface-bg)] py-2.5 pl-10 pr-3 text-[14px] text-[var(--admin-fg-strong)] outline-none placeholder:text-[var(--admin-muted)] focus:border-[var(--admin-accent)] focus:shadow-[0_0_0_2px_rgba(14,165,233,0.25)]"
        />
      </label>

      {shown.length === 0 ? (
        <div className="admin-card p-10 text-center">
          <p className="admin-body">
            {members.length === 0
              ? 'No members have joined yet. Share the church code so people can join in the app.'
              : 'No members match that search.'}
          </p>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-admin text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-dim">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="hidden px-5 py-3 sm:table-cell">Contact</th>
                <th className="hidden px-5 py-3 md:table-cell">Joined</th>
                <th className="px-5 py-3">Last active</th>
                {canRemove && (
                  <th className="px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {shown.map((m) => (
                <tr key={m.id} className="hover:bg-admin-nav-hover/40">
                  <td className="px-5 py-4">
                    <p className="text-[15px] font-medium text-[var(--admin-fg-strong)]">
                      {displayName(m)}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--admin-muted)] sm:hidden">
                      {contactLine(m)}
                    </p>
                  </td>
                  <td className="hidden px-5 py-4 text-[14px] text-[var(--admin-fg-strong)] sm:table-cell">
                    {contactLine(m)}
                  </td>
                  <td className="hidden whitespace-nowrap px-5 py-4 text-[14px] text-[var(--admin-fg-strong)] md:table-cell">
                    {formatWhen(m.joined_at)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-[14px] text-[var(--admin-fg-strong)]">
                    {formatWhen(m.last_active_at)}
                  </td>
                  {canRemove && (
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(m)}
                        disabled={removing}
                        className="text-[14px] font-medium text-red-500 hover:underline disabled:opacity-50"
                        aria-label={`Remove ${displayName(m)}`}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalShell
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        labelledBy="member-remove-title"
        locked={removing}
        panelClassName="admin-card max-w-md shadow-xl"
      >
        <div className="p-6">
          <h3 id="member-remove-title" className="admin-section-title">
            Remove {removeTarget ? displayName(removeTarget) : ''}?
          </h3>
          <p className="admin-body mt-2">
            They will no longer see your church&apos;s devotionals or notifications. Their account
            stays, and they can rejoin later with your church code.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setRemoveTarget(null)}
              disabled={removing}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmRemove()}
              disabled={removing}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors duration-fast hover:bg-red-700 disabled:opacity-60"
            >
              {removing ? 'Removing…' : 'Remove member'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
