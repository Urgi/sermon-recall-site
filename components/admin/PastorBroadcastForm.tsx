'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useId, useState } from 'react';

import {
  audienceTypeLabel,
  BROADCAST_AUDIENCE_OPTIONS,
  type AudienceType,
} from '@/lib/admin/workflow-status';

export function PastorBroadcastForm() {
  const router = useRouter();
  const formId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('all_members');
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pushWarnings, setPushWarnings] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError('Title and message are required.');
      return;
    }
    setShowConfirm(true);
  }, [title, body]);

  async function confirmSend() {
    setShowConfirm(false);
    setError(null);
    setSuccess(null);
    setPushWarnings(null);
    setPending(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const res = await fetch('/api/church/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          audienceType,
          idempotencyKey,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        recipientCount?: number;
        warning?: string;
        pushTicketErrors?: string[];
        duplicate?: boolean;
      };
      setPending(false);
      if (!res.ok) {
        setError(data.error ?? 'Could not send.');
        return;
      }
      const n = data.recipientCount ?? 0;
      setPushWarnings(
        data.pushTicketErrors?.length ? data.pushTicketErrors : null,
      );
      setSuccess(
        data.duplicate
          ? 'Already sent (duplicate prevented).'
          : data.warning ?? `Sent to ${n} staff member${n === 1 ? '' : 's'} with push enabled.`,
      );
      if (!data.duplicate) {
        setTitle('');
        setBody('');
      }
      router.refresh();
    } catch {
      setPending(false);
      setError('Network error.');
    }
  }

  return (
    <>
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="broadcast-title" className="admin-label">
            Title <span className="admin-hint">(max 80 characters)</span>
          </label>
          <input
            id="broadcast-title"
            name="title"
            type="text"
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="admin-input mt-1"
            placeholder="e.g. Women's retreat signup closes Friday"
          />
        </div>
        <div>
          <label htmlFor="broadcast-body" className="admin-label">
            Message <span className="admin-hint">(max 320 characters)</span>
          </label>
          <textarea
            id="broadcast-body"
            name="body"
            required
            maxLength={320}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="admin-input mt-1"
            placeholder="Your message to the church…"
          />
        </div>
        <div>
          <label htmlFor="broadcast-audience" className="admin-label">
            Audience
          </label>
          <select
            id="broadcast-audience"
            value={audienceType}
            onChange={(e) => setAudienceType(e.target.value as AudienceType)}
            className="admin-input mt-1"
          >
            {BROADCAST_AUDIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {audienceType === 'staff_associate_and_elder' ? (
            <p className="admin-hint mt-1.5 text-[12px] leading-snug">
              Only active team members with roles <strong>Associate pastor</strong> or{' '}
              <strong>Elder</strong> (from Team). They must use the mobile app with notifications
              enabled to receive the push.
            </p>
          ) : null}
        </div>
        {title && body ? (
          <div className="admin-card-nested p-4">
            <p className="admin-hint text-xs font-semibold uppercase">Preview</p>
            <p className="mt-2 font-semibold text-admin-fg-strong">{title}</p>
            <p className="admin-body mt-1">{body}</p>
          </div>
        ) : null}
        <button type="submit" disabled={pending} className="admin-btn-primary">
          {pending ? 'Sending…' : 'Review & send now'}
        </button>
        {error ? (
          <p className="text-[13px] text-red-500" role="alert">
            {error}
          </p>
        ) : null}
        {success ? <p className="text-[13px] text-emerald-600">{success}</p> : null}
        {pushWarnings ? (
          <p className="text-[12px] text-amber-600">{pushWarnings.join(', ')}</p>
        ) : null}
      </form>

      {showConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-send-title"
        >
          <div className="admin-card max-w-md p-6 shadow-xl">
            <h3 id="confirm-send-title" className="admin-section-title">
              Send notification now?
            </h3>
            <p className="admin-body mt-2">
              This will immediately push to{' '}
              <strong>{audienceTypeLabel(audienceType).toLowerCase()}</strong> who have the app with
              notifications enabled. This cannot be undone.
            </p>
            <div className="admin-card-nested mt-4 p-3">
              <p className="font-semibold text-admin-fg-strong">{title}</p>
              <p className="admin-body mt-1 text-sm">{body}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => void confirmSend()} className="admin-btn-primary">
                Send now
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="admin-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
