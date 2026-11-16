'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { ModalShell } from '@/components/admin/ModalShell';
import { useLanguage } from '@/components/i18n/LanguageProvider';

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
  const { t } = useLanguage();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = sermonTitle.trim() || 'this sermon';
  const shortLabel = label.length > 80 ? `${label.slice(0, 77)}…` : label;

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
          className="inline-flex min-h-8 items-center text-[13px] font-medium text-red-500 hover:underline dark:text-red-400"
        >
          {t('sermons.delete')}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-[12px] font-semibold text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/50"
        >
          {t('sermons.deleteConfirm')}
        </button>
      )}

      <ModalShell
        open={open}
        onClose={close}
        labelledBy={titleId}
        locked={busy}
        panelClassName="max-w-md rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-card-bg)] shadow-xl"
      >
        <div className="p-6">
            <h2 id={titleId} className="text-lg font-semibold text-[var(--admin-fg-strong)]">
              {t('sermons.deleteTitle')}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--admin-fg-secondary)]">
              {t('sermons.deleteBody', { title: shortLabel })}
            </p>
            {published ? (
              <p className="mt-3 text-[13px] leading-relaxed text-amber-700 dark:text-amber-200">
                {t('sermons.deleteLive')}
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
                {t('sermons.deleteAck')}
              </span>
            </label>
            {error ? (
              <p className="mt-3 text-[13px] text-red-600 dark:text-red-400" role="alert">
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
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={busy || !ack}
                onClick={() => void onConfirm()}
                className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? t('sermons.deleting') : t('sermons.deleteConfirm')}
              </button>
            </div>
        </div>
      </ModalShell>
    </>
  );
}
