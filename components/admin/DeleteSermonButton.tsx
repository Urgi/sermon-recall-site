'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

type Props = {
  sermonId: string;
  sermonTitle: string;
  published?: boolean;
  variant?: 'button' | 'inline';
};

export function DeleteSermonButton({
  sermonId,
  sermonTitle,
  published = false,
  variant = 'button',
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = sermonTitle.trim() || 'this sermon';
  const shortLabel = label.length > 80 ? `${label.slice(0, 77)}…` : label;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, open]);

  function close() {
    if (busy) return;
    setOpen(false);
    setAck(false);
    setError(null);
  }

  async function onConfirm() {
    if (!ack) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sermons/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sermonId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Could not delete sermon.');
        setBusy(false);
        return;
      }
      setOpen(false);
      router.push('/sermons');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
      setBusy(false);
    }
  }

  return (
    <>
      {variant === 'inline' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[13px] font-medium text-red-400 hover:underline"
        >
          Delete
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-1.5 text-[12px] font-semibold text-red-200 hover:bg-red-950/50"
        >
          Delete sermon
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-card-bg)] p-6 shadow-xl"
          >
            <h2 id={titleId} className="text-lg font-semibold text-[var(--admin-fg-strong)]">
              Delete this sermon?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--admin-fg-secondary)]">
              This permanently removes <span className="font-semibold text-[var(--admin-fg-strong)]">“{shortLabel}”</span>,
              its devotionals, and related member progress. This cannot be undone.
            </p>
            {published ? (
              <p className="mt-3 text-[13px] leading-relaxed text-amber-700 dark:text-amber-200">
                This sermon is live. Members who started it will lose that journey.
              </p>
            ) : null}
            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-admin"
              />
              <span className="text-[13px] leading-snug text-[var(--admin-fg-secondary)]">
                I understand this cannot be undone.
              </span>
            </label>
            {error ? (
              <p className="mt-3 text-[13px] text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={close}
                className="admin-btn-secondary px-4 py-2 text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !ack}
                onClick={() => void onConfirm()}
                className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? 'Deleting…' : 'Delete sermon'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
