'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import {
  canPublishWorkflow,
  canRegenerateWorkflow,
  canSubmitForApproval,
  workflowStatusBadgeClass,
  workflowStatusLabel,
} from '@/lib/admin/workflow-status';

type Props = {
  sermonId: string;
  workflowStatus: SermonWorkflowStatus;
  approvalRequired: boolean;
  canApprove: boolean;
  canPublish: boolean;
  changesRequestedNote?: string | null;
};

export function SermonWorkflowPanel({
  sermonId,
  workflowStatus,
  approvalRequired,
  canApprove,
  canPublish,
  changesRequestedNote,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function post(url: string, payload: Record<string, unknown>) {
    setError(null);
    setPending(true);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string };
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? 'Action failed.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="admin-card mt-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={workflowStatusBadgeClass(workflowStatus)}>
          {workflowStatusLabel(workflowStatus)}
        </span>
        {approvalRequired ? (
          <span className="admin-hint">Approval required before publish</span>
        ) : (
          <span className="admin-hint">Direct publish enabled</span>
        )}
      </div>

      {changesRequestedNote ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[13px] text-amber-800 dark:text-amber-100">
          Changes requested: {changesRequestedNote}
        </p>
      ) : null}

      {canApprove && workflowStatus === 'submitted_for_approval' ? (
        <div className="mt-4 space-y-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => void post('/api/devotionals/approve', { sermonId })}
            className="admin-btn-primary"
          >
            Approve devotionals
          </button>
          <div>
            <label className="admin-label" htmlFor="changes-note">
              Request changes (optional note)
            </label>
            <textarea
              id="changes-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="admin-input mt-1"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => void post('/api/devotionals/request-changes', { sermonId, note })}
              className="admin-btn-secondary mt-2"
            >
              Request changes
            </button>
          </div>
        </div>
      ) : null}

      {canPublish && canPublishWorkflow(workflowStatus) ? (
        <p className="admin-hint mt-3">Ready to publish — use Publish to app in the preview section.</p>
      ) : null}

      {!canRegenerateWorkflow(workflowStatus) ? (
        <p className="admin-hint mt-2">
          Regeneration is locked while this devotional is in review or live.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-[13px] text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
