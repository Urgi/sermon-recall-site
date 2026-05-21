'use client';

import type { DevotionalDay } from '@/lib/devotionals/devotional-days';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import {
  canPublishWorkflow,
  canRegenerateWorkflow,
  canSubmitForApproval,
} from '@/lib/admin/workflow-status';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  sermonId: string;
  sermonTitle: string;
  hasTranscript: boolean;
  hasExistingDevotionals: boolean;
  approvalRequired: boolean;
  workflowStatus: SermonWorkflowStatus;
  canPublish: boolean;
  canSubmit: boolean;
};

const EXCERPT = 180;

export function GeminiDevotionalWorkflow({
  sermonId,
  sermonTitle,
  hasTranscript,
  hasExistingDevotionals,
  approvalRequired,
  workflowStatus,
  canPublish,
  canSubmit,
}: Props) {
  const router = useRouter();
  const [previewDays, setPreviewDays] = useState<DevotionalDay[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRegen = canRegenerateWorkflow(workflowStatus);

  async function generatePreview() {
    if (!hasTranscript || !canRegen) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-devotionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ sermonId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        days?: DevotionalDay[];
      };
      if (!res.ok) {
        const msg = data.error ?? 'Generation failed.';
        setError(data.hint ? `${msg} ${data.hint}` : msg);
        return;
      }
      if (!data.days?.length) {
        setError('Unexpected response from server.');
        return;
      }
      setPreviewDays(data.days);
    } finally {
      setGenerating(false);
    }
  }

  async function publish() {
    if (!previewDays?.length && workflowStatus !== 'approved') return;
    if (hasExistingDevotionals && workflowStatus !== 'approved') {
      const ok = window.confirm(
        'Replace existing devotionals with this preview? Members will see new content after publish.',
      );
      if (!ok) return;
    }
    setError(null);
    setPublishing(true);
    try {
      const res = await fetch('/api/publish-devotionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          sermonId,
          days: previewDays ?? [],
          replace: hasExistingDevotionals && workflowStatus !== 'approved',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Publish failed.');
        return;
      }
      setPreviewDays(null);
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function submitForApproval() {
    if (!previewDays?.length) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/devotionals/submit-for-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          sermonId,
          days: previewDays,
          replace: hasExistingDevotionals,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Submit failed.');
        return;
      }
      setPreviewDays(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function publishApproved() {
    setError(null);
    setPublishing(true);
    try {
      const res = await fetch('/api/publish-devotionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ sermonId, days: [] }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Publish failed.');
        return;
      }
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  function discardPreview() {
    setPreviewDays(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {workflowStatus === 'approved' && canPublish ? (
        <button
          type="button"
          onClick={() => void publishApproved()}
          disabled={publishing}
          className="admin-btn-primary"
        >
          {publishing ? 'Publishing…' : 'Publish approved devotionals to app'}
        </button>
      ) : null}

      {!previewDays && workflowStatus !== 'approved' ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void generatePreview()}
            disabled={generating || !hasTranscript || !canRegen}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? 'Generating preview…' : 'Generate preview with AI'}
          </button>
          {!hasTranscript ? (
            <p className="admin-hint text-amber-700 dark:text-amber-200/90">
              Add sermon script or notes on this page first.
            </p>
          ) : !canRegen ? (
            <p className="admin-hint">Cannot regenerate while in review or published.</p>
          ) : (
            <p className="admin-hint">
              {approvalRequired
                ? 'Submit for approval when ready. Nothing goes live until approved and published.'
                : 'Publish when ready — members see content after you publish.'}
            </p>
          )}
        </div>
      ) : previewDays ? (
        <div className="admin-card space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-violet-600 dark:text-violet-200">
                Preview (not live yet)
              </p>
              <p className="admin-hint mt-1">
                Review all six days before submitting or publishing.
              </p>
            </div>
            {canRegen ? (
              <button
                type="button"
                onClick={() => void generatePreview()}
                disabled={generating}
                className="text-[13px] font-medium text-violet-600 hover:text-violet-500 disabled:opacity-50 dark:text-violet-300"
              >
                {generating ? 'Regenerating…' : 'Regenerate preview'}
              </button>
            ) : null}
          </div>

          <ul className="space-y-3">
            {previewDays.map((d) => (
              <li key={d.day_number} className="admin-card-nested p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-admin-accent">
                  Day {d.day_number}
                </p>
                <p className="admin-hint mt-1">{sermonTitle}</p>
                <p className="mt-2 text-[16px] font-semibold text-admin-fg-strong">{d.title}</p>
                {d.scripture_reference ? (
                  <p className="mt-2 text-[13px] font-medium text-sky-600 dark:text-sky-300">
                    {d.scripture_reference}
                  </p>
                ) : null}
                <p className="admin-body mt-2 text-[13px]">
                  {d.main_content.length > EXCERPT
                    ? `${d.main_content.slice(0, EXCERPT).trim()}…`
                    : d.main_content}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 pt-2">
            {approvalRequired && canSubmit && canSubmitForApproval(workflowStatus) ? (
              <button
                type="button"
                onClick={() => void submitForApproval()}
                disabled={submitting}
                className="admin-btn-primary"
              >
                {submitting ? 'Submitting…' : 'Submit for approval'}
              </button>
            ) : null}
            {!approvalRequired && canPublish ? (
              <button
                type="button"
                onClick={() => void publish()}
                disabled={publishing}
                className="admin-btn-primary"
              >
                {publishing ? 'Publishing…' : 'Publish to app'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={discardPreview}
              disabled={publishing || submitting}
              className="admin-btn-secondary"
            >
              Discard preview
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="max-w-xl text-[13px] text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
