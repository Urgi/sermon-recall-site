'use client';

import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { ModalShell } from '@/components/admin/ModalShell';
import { isAppReviewAccount, type ChurchMemberRow } from '@/lib/admin/church-members';

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
  // Keeps the dialog's copy in place while it animates closed after removeTarget is cleared.
  const lastTargetRef = useRef<ChurchMemberRow | null>(null);
  if (removeTarget) lastTargetRef.current = removeTarget;
  const dialogTarget = removeTarget ?? lastTargetRef.current;
  const dialogIsReviewer = dialogTarget ? isAppReviewAccount(dialogTarget) : false;
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
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`admin-notice ${notice.kind === 'error' ? 'admin-notice--error' : 'admin-notice--success'}`}
        >
          <p className="min-w-0 flex-1">{notice.text}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="-my-1 -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--admin-muted)] hover:bg-admin-nav-hover hover:text-[var(--admin-fg-strong)]"
            aria-label="Dismiss"
          >
            <span aria-hidden className="text-lg leading-none">×</span>
          </button>
        </div>
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
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-admin text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-dim">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="hidden px-5 py-3 sm:table-cell">Contact</th>
                <th className="hidden px-5 py-3 md:table-cell">Joined</th>
                <th className="px-5 py-3">Last active</th>
                {canRemove && (
                  <th className="hidden px-5 py-3 sm:table-cell">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {shown.map((m) => (
                <tr key={m.id} className="hover:bg-admin-nav-hover/40">
                  <td className="px-5 py-4">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-[var(--admin-fg-strong)]">
                      <span className="min-w-0 break-words">{displayName(m)}</span>
                      {isAppReviewAccount(m) && (
                        <span
                          className="admin-badge admin-badge--reviewer px-2 py-0.5 text-[11px]"
                          title="Apple's App Review team signs in with this account. Keep it in your church."
                        >
                          App Review account
                        </span>
                      )}
                    </p>
                    <p className="mt-1 break-all text-[13px] text-[var(--admin-muted)] sm:hidden">
                      {contactLine(m)}
                    </p>
                    {canRemove && (
                      <div className="mt-1 sm:hidden">
                        <RemoveButton
                          name={displayName(m)}
                          disabled={removing}
                          onClick={() => setRemoveTarget(m)}
                          className="-ml-2"
                        />
                      </div>
                    )}
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
                    <td className="hidden whitespace-nowrap px-5 py-4 text-right sm:table-cell">
                      <RemoveButton
                        name={displayName(m)}
                        disabled={removing}
                        onClick={() => setRemoveTarget(m)}
                        className="-mr-2"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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
            Remove {dialogTarget ? displayName(dialogTarget) : 'member'}?
          </h3>
          {dialogIsReviewer && (
            <p className="admin-notice admin-notice--warning mt-3" role="alert">
              <span>
                <strong>This is the App Review account.</strong> Apple&apos;s reviewers sign in with
                it to test the app. Removing it can hold up your next App Store review.
              </span>
            </p>
          )}
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

function RemoveButton({
  name,
  disabled,
  onClick,
  className = '',
}: {
  name: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-8 items-center rounded-md px-2 text-[14px] font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400 ${className}`}
      aria-label={`Remove ${name}`}
    >
      Remove
    </button>
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
