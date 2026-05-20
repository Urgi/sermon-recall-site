'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  DELETE_CONFIRM_PHRASE,
  type AccountDeletionPreview,
  parseDeletionPreview,
} from '@/lib/account/deletion';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function DeleteAccountPanel() {
  const router = useRouter();
  const [preview, setPreview] = useState<AccountDeletionPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [churchAck, setChurchAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const res = await fetch('/api/account/deletion-preview');
      const json = (await res.json()) as { preview?: unknown; error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Could not load account details.');
        return;
      }
      setPreview(parseDeletionPreview(json.preview));
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
    if (confirmText.trim() !== DELETE_CONFIRM_PHRASE) {
      setError(`Type ${DELETE_CONFIRM_PHRASE} to confirm.`);
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
    <section className="rounded-xl border border-red-500/30 bg-red-950/20 p-6">
      <h2 className="text-lg font-semibold text-red-100">Delete account</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-red-100/80">
        Permanently remove your sign-in and profile from Sermon Recall. This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={loadingPreview}
          className="mt-4 rounded-lg border border-red-500/50 px-4 py-2 text-[14px] font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-50"
        >
          {loadingPreview ? 'Loading…' : 'Delete my account…'}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          {preview?.will_delete_church ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-[13px] leading-relaxed text-amber-100">
              <p className="font-semibold text-amber-50">You are the only pastor for this church</p>
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
            <p className="text-[13px] text-[#94a3b8]">
              You will leave <strong className="text-[#e2e8f0]">{preview.church_name}</strong> as an
              admin user. The church and other members are not deleted.
            </p>
          ) : (
            <p className="text-[13px] text-[#94a3b8]">
              Your personal data and sign-in will be removed. Church content you only viewed as a
              member is not affected.
            </p>
          )}

          {preview?.will_delete_church ? (
            <label className="flex cursor-pointer items-start gap-3 text-[13px] text-[#e2e8f0]">
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
            <label htmlFor="delete-confirm" className="block text-[13px] font-medium text-[#94a3b8]">
              Type <span className="font-mono text-red-200">{DELETE_CONFIRM_PHRASE}</span> to confirm
            </label>
            <input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-1 w-full rounded-lg border border-red-500/30 bg-[#05070a] px-3 py-2 text-[15px] text-white"
              autoComplete="off"
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
                setConfirmText('');
                setChurchAck(false);
                setError(null);
              }}
              className="rounded-lg px-4 py-2 text-[14px] text-[#94a3b8] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
