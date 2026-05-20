'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  emailsMatchForDeletion,
  type AccountDeletionPreview,
  parseDeletionPreview,
} from '@/lib/account/deletion';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function DeleteAccountPanel() {
  const router = useRouter();
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
        setError(json.error ?? 'Could not load account details.');
        return;
      }
      setPreview(parseDeletionPreview(json.preview));
      setAccountEmail(typeof json.email === 'string' ? json.email : '');
    } catch {
      setError('Network error loading account details.');
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
      setError('Enter your account email to confirm deletion.');
      return;
    }
    if (preview?.will_delete_church && !churchAck) {
      setError('Confirm that you understand your church will be removed from Sermon Recall.');
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
        setError(json.error ?? 'Could not delete account.');
        return;
      }
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-delete-zone">
      <h2 className="admin-delete-zone__title">Delete account</h2>
      <p className="admin-delete-zone__hint">
        Permanently remove your sign-in and profile from Sermon Recall. This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={loadingPreview}
          className="admin-delete-zone__outline-btn"
        >
          {loadingPreview ? 'Loading…' : 'Delete my account'}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          {preview?.will_delete_church ? (
            <div className="admin-delete-zone__warn">
              <p className="admin-delete-zone__warn-title">You are the only pastor for this church</p>
              <p className="mt-2">
                Deleting your account will remove{' '}
                <strong>{preview.church_name ?? 'your church'}</strong> from Sermon Recall,
                including sermons and devotionals.
              </p>
              {preview.other_member_count > 0 ? (
                <p className="mt-2">
                  {preview.other_member_count} member
                  {preview.other_member_count === 1 ? '' : 's'} will be signed out of this church and
                  asked to join another congregation. They will see a message that{' '}
                  {preview.church_name ?? 'their church'} has ended its use of Sermon Recall on this
                  platform.
                </p>
              ) : null}
            </div>
          ) : preview?.church_id && preview.role !== 'member' ? (
            <p className="admin-delete-zone__body-text">
              You will leave <strong>{preview.church_name}</strong> as an admin user. The church and
              other members are not deleted.
            </p>
          ) : (
            <p className="admin-delete-zone__body-text">
              Your personal data and sign-in will be removed. Church content you only viewed as a
              member is not affected.
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
                I understand that my church will be removed from Sermon Recall and members will need
                to join another church to continue.
              </span>
            </label>
          ) : null}

          <div>
            <label htmlFor="delete-confirm-email" className="admin-delete-zone__label block">
              Re-enter your email to confirm
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
            <p className="text-[13px] text-red-400" role="alert">
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
              {pending ? 'Deleting…' : 'Permanently delete account'}
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
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
