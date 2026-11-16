'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useId, useState } from 'react';

import type { StaffRole } from '@/lib/auth/permissions';
import { formatTargetStaffRoles } from '@/lib/push/broadcast-audience';
import { BroadcastRoleAudience } from '@/components/admin/BroadcastRoleAudience';
import { ModalShell } from '@/components/admin/ModalShell';
import { useLanguage } from '@/components/i18n/LanguageProvider';

const DEFAULT_ROLES: StaffRole[] = ['owner', 'admin_pastor', 'associate_pastor'];

type Props = {
  /** When set, this visit came from “Send encouragement.” */
  encourageInactiveCount?: number;
};

export function PastorBroadcastForm({ encourageInactiveCount }: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const formId = useId();
  const [title, setTitle] = useState(
    encourageInactiveCount != null && encourageInactiveCount > 0
      ? 'A note of encouragement'
      : '',
  );
  const [body, setBody] = useState(
    encourageInactiveCount != null && encourageInactiveCount > 0
      ? 'We’d love for you to finish this week’s devotional when you can. You’re not behind — just pick up today’s day.'
      : '',
  );
  const [targetStaffRoles, setTargetStaffRoles] = useState<StaffRole[]>(DEFAULT_ROLES);
  const [includeAllMembers, setIncludeAllMembers] = useState(
    Boolean(encourageInactiveCount && encourageInactiveCount > 0),
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pushWarnings, setPushWarnings] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!title.trim() || !body.trim()) {
        setError('Title and message are required.');
        return;
      }
      if (targetStaffRoles.length === 0 && !includeAllMembers) {
        setError('Select at least one team role or all members.');
        return;
      }
      setShowConfirm(true);
    },
    [title, body, targetStaffRoles, includeAllMembers],
  );

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
          targetStaffRoles,
          includeAllMembers,
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
      setPushWarnings(data.pushTicketErrors?.length ? data.pushTicketErrors : null);
      setSuccess(
        data.duplicate
          ? 'Already sent (duplicate prevented).'
          : data.warning ?? `Sent to ${n} people. Track opens in notification history below.`,
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

  const audienceSummary = [
    formatTargetStaffRoles(targetStaffRoles),
    includeAllMembers ? 'all members' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        {encourageInactiveCount != null && encourageInactiveCount > 0 ? (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-[13px] text-[var(--admin-fg-secondary)]">
            {encourageInactiveCount === 1
              ? '1 member has not completed a devotional this week.'
              : `${encourageInactiveCount} members have not completed a devotional this week.`}{' '}
            This composer cannot yet send only to those people. Tick <strong>All church members</strong>{' '}
            to reach them, or leave it off to notify staff only. Nothing sends until you review and
            confirm.
          </div>
        ) : null}
        <div>
          <label htmlFor="broadcast-title" className="admin-label">
            {t('notify.fieldTitle')} <span className="admin-hint tabular-nums">· {title.length}/80</span>
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
            placeholder={t('notify.placeholderTitle')}
          />
        </div>
        <div>
          <label htmlFor="broadcast-body" className="admin-label">
            {t('notify.fieldMessage')} <span className="admin-hint tabular-nums">· {body.length}/320</span>
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
            placeholder={t('notify.placeholderMessage')}
          />
        </div>

        <BroadcastRoleAudience
          selected={targetStaffRoles}
          includeAllMembers={includeAllMembers}
          onSelectedChange={setTargetStaffRoles}
          onIncludeAllMembersChange={setIncludeAllMembers}
          disabled={pending}
        />

        {title && body ? (
          <div className="admin-card-nested p-4">
            <p className="admin-hint text-xs font-semibold uppercase">{t('notify.preview')}</p>
            <p className="mt-2 font-semibold text-admin-fg-strong">{title}</p>
            <p className="admin-body mt-1">{body}</p>
            <p className="admin-hint mt-2 text-[12px]">{t('notify.to', { audience: audienceSummary })}</p>
          </div>
        ) : null}
        <button type="submit" disabled={pending} className="admin-btn-primary">
          {pending ? t('notify.sending') : t('notify.review')}
        </button>
        {error ? (
          <p className="text-[13px] text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-[13px] text-emerald-700 dark:text-emerald-400" role="status">
            {success}
          </p>
        ) : null}
        {pushWarnings ? (
          <p className="text-[12px] text-amber-700 dark:text-amber-500">{pushWarnings.join(', ')}</p>
        ) : null}
      </form>

      <ModalShell
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        labelledBy="confirm-send-title"
        panelClassName="admin-card max-w-md shadow-xl"
      >
          <div className="p-6">
            <h3 id="confirm-send-title" className="admin-section-title">
              {t('notify.confirmTitle')}
            </h3>
            <p className="admin-body mt-2">
              This will push to: <span className="font-medium">{audienceSummary}</span>. Recipients
              tap to read the full message in the app; you can see who opened it in history.
            </p>
            <div className="admin-card-nested mt-4 p-3">
              <p className="font-semibold text-admin-fg-strong">{title}</p>
              <p className="admin-body mt-1 text-sm">{body}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => void confirmSend()} className="admin-btn-primary">
                {t('notify.sendNow')}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="admin-btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
      </ModalShell>
    </>
  );
}
