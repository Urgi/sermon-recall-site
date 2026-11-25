'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  emailsMatchForDeletion,
  type AccountDeletionPreview,
  parseDeletionPreview,
} from '@/lib/account/deletion';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { localizeApiError } from '@/lib/i18n/api-errors';
import { tr } from '@/lib/i18n/ui';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function DeleteAccountPanel() {
  const router = useRouter();
  const { t } = useLanguage();
  const [preview, setPreview] = useState<AccountDeletionPreview | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [churchAck, setChurchAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const res = await fetch('/api/account/deletion-preview');
      const json = (await res.json()) as { preview?: unknown; email?: string; error?: string };
      if (!res.ok) {
        setError(json.error ? localizeApiError(json.error) : tr('del.err.load'));
        return;
      }
      setPreview(parseDeletionPreview(json.preview));
      setAccountEmail(typeof json.email === 'string' ? json.email : '');
    } catch {
      setError(tr('del.err.network'));
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function onDelete() {
    setError(null);
    if (!accountEmail || !emailsMatchForDeletion(confirmEmail, accountEmail)) {
      setError(t('del.err.email'));
      return;
    }
    if (preview?.will_delete_church && !churchAck) {
      setError(t('del.err.ack'));
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmChurchDeletion: preview?.will_delete_church === true,
          confirmEmail: confirmEmail.trim(),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ? localizeApiError(json.error) : t('del.err.delete'));
        return;
      }
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      setError(t('settings.networkError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-delete-zone">
      <h2 className="admin-delete-zone__title">{t('del.title')}</h2>
      <p className="admin-delete-zone__hint">
        {t('del.hint')}
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={loadingPreview}
          className="admin-delete-zone__outline-btn"
        >
          {loadingPreview ? t('settings.loading') : t('del.open')}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          {preview?.will_delete_church ? (
            <div className="admin-delete-zone__warn">
              <p className="admin-delete-zone__warn-title">{t('del.onlyPastorTitle')}</p>
              <p className="mt-2">
                {t('del.willRemove', { church: preview.church_name ?? t('del.yourChurch') })}
              </p>
              {preview.other_member_count > 0 ? (
                <p className="mt-2">
                  {preview.other_member_count === 1
                    ? t('del.member1', { church: preview.church_name ?? t('del.theirChurch') })
                    : t('del.members', {
                        n: preview.other_member_count,
                        church: preview.church_name ?? t('del.theirChurch'),
                      })}
                </p>
              ) : null}
            </div>
          ) : preview?.church_id && preview.role !== 'member' ? (
            <p className="admin-delete-zone__body-text">
              {t('del.leaveAdmin', { church: preview.church_name ?? t('del.yourChurch') })}
            </p>
          ) : (
            <p className="admin-delete-zone__body-text">
              {t('del.personal')}
            </p>
          )}

          {preview?.will_delete_church ? (
            <label className="flex cursor-pointer items-start gap-3 admin-delete-zone__checkbox-label">
              <input
                type="checkbox"
                checked={churchAck}
                onChange={(e) => setChurchAck(e.target.checked)}
                className="mt-1"
              />
              <span>
                {t('del.ack')}
              </span>
            </label>
          ) : null}

          <div>
            <label htmlFor="delete-confirm-email" className="admin-delete-zone__label block">
              {t('del.reenter')}
            </label>
            <input
              id="delete-confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoComplete="email"
              placeholder={accountEmail || 'you@example.com'}
              className="admin-delete-zone__input"
            />
          </div>

          {error ? (
            <p className="text-[13px] text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => void onDelete()}
              className="rounded-lg bg-red-600 px-4 py-2 text-[14px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? t('del.deleting') : t('del.confirm')}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setConfirmEmail('');
                setChurchAck(false);
                setError(null);
              }}
              className="admin-delete-zone__cancel"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
