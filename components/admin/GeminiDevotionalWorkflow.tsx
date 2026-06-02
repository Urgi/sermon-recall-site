'use client';

import { DevotionalGenerationHints } from '@/components/admin/DevotionalGenerationHints';
import { DevotionalPreviewReviewList } from '@/components/admin/DevotionalPreviewReviewList';
import { TranscribeProgressPanel } from '@/components/admin/TranscribeProgressPanel';
import { TranscriptionJobPoller } from '@/components/admin/TranscriptionJobPoller';
import type { DevotionalDay } from '@/lib/devotionals/devotional-days';
import {
  clearPreviewDays,
  loadPreviewDays,
  savePreviewDays,
} from '@/lib/devotionals/preview-session';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import {
  canRegenerateWorkflow,
  canSubmitForApproval,
} from '@/lib/admin/workflow-status';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  sermonId: string;
  churchId: string;
  sermonTitle: string;
  pastorName: string;
  sermonDate: string;
  transcript: string;
  hasTranscript: boolean;
  hasExistingDevotionals: boolean;
  approvalRequired: boolean;
  workflowStatus: SermonWorkflowStatus;
  canPublish: boolean;
  canSubmit: boolean;
};

export function GeminiDevotionalWorkflow({
  sermonId,
  churchId,
  sermonTitle,
  pastorName,
  sermonDate,
  transcript,
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
  const [generatingStartedAt, setGeneratingStartedAt] = useState<number | null>(null);
  const [transcriptionJobId, setTranscriptionJobId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoGenerateAttempted = useRef(false);

  const canRegen = canRegenerateWorkflow(workflowStatus);

  useEffect(() => {
    const stored = loadPreviewDays(sermonId);
    if (stored?.length === 6) {
      setPreviewDays(stored);
      autoGenerateAttempted.current = true;
    }
  }, [sermonId]);

  useEffect(() => {
    if (hasTranscript || hasExistingDevotionals) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/transcription/jobs?sermonId=${encodeURIComponent(sermonId)}`,
        { credentials: 'include' },
      );
      const json = (await res.json()) as { job?: { id: string; status: string } | null };
      if (!cancelled && json.job?.id && json.job.status !== 'failed') {
        setTranscriptionJobId(json.job.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasExistingDevotionals, hasTranscript, sermonId]);

  const generatePreview = useCallback(async () => {
    if (!hasTranscript || !canRegen) return;
    setError(null);
    setGenerating(true);
    setGeneratingStartedAt(Date.now());
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
      savePreviewDays(sermonId, data.days);
      setPreviewDays(data.days);
    } finally {
      setGenerating(false);
      setGeneratingStartedAt(null);
    }
  }, [canRegen, hasTranscript, sermonId]);

  useEffect(() => {
    if (autoGenerateAttempted.current) return;
    if (!hasTranscript || hasExistingDevotionals || !canRegen || previewDays) return;
    autoGenerateAttempted.current = true;
    void generatePreview();
  }, [canRegen, generatePreview, hasExistingDevotionals, hasTranscript, previewDays]);

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
      clearPreviewDays(sermonId);
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
      clearPreviewDays(sermonId);
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
    clearPreviewDays(sermonId);
    setPreviewDays(null);
    setError(null);
  }

  const awaitingTranscript = !hasTranscript && !hasExistingDevotionals;
  const pipelineActive = awaitingTranscript && Boolean(transcriptionJobId);

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

      {!approvalRequired &&
      canPublish &&
      hasExistingDevotionals &&
      workflowStatus !== 'published' &&
      workflowStatus !== 'approved' ? (
        <button
          type="button"
          onClick={() => void publishApproved()}
          disabled={publishing}
          className="admin-btn-primary"
        >
          {publishing ? 'Publishing…' : 'Publish devotionals to app'}
        </button>
      ) : null}

      {awaitingTranscript ? (
        pipelineActive ? (
          <TranscriptionJobPoller
            jobId={transcriptionJobId!}
            sermonId={sermonId}
            onPreviewReady={(days) => setPreviewDays(days)}
            onComplete={() => router.refresh()}
          />
        ) : (
          <div className="admin-card p-4" role="status">
            <p className="text-[14px] font-medium text-[var(--admin-accent)]">
              Waiting for sermon text…
            </p>
            <p className="admin-hint mt-2 text-[13px] leading-relaxed">
              When transcription finishes, the same progress bar will continue into your six-day
              preview. Nothing is published until you approve it.
            </p>
          </div>
        )
      ) : null}

      {generating && !previewDays && generatingStartedAt != null ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <TranscribeProgressPanel
            phase="devotionals"
            phaseStartedAt={generatingStartedAt}
            fileBytes={0}
          />
          <DevotionalGenerationHints active variant="six-day" />
        </div>
      ) : null}

      {!previewDays && !generating && !pipelineActive && hasTranscript && canRegen && !hasExistingDevotionals ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void generatePreview()}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-violet-500"
          >
            Generate preview with AI
          </button>
          <p className="admin-hint text-[13px]">
            Preview generation did not start automatically. Click to try again.
          </p>
        </div>
      ) : null}

      {!previewDays && !generating && hasTranscript && !canRegen ? (
        <p className="admin-hint">Cannot regenerate while in review or published.</p>
      ) : null}

      {previewDays ? (
        <div className="admin-card space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-violet-600 dark:text-violet-200">
                Preview (not live yet)
              </p>
              <p className="admin-hint mt-1">
                Review all six days before submitting or publishing.
                {approvalRequired
                  ? ' Nothing goes live until approved and published.'
                  : ' Publish when ready — members see content after you publish.'}
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

          <DevotionalPreviewReviewList
            churchId={churchId}
            sermonTitle={sermonTitle}
            pastorName={pastorName}
            sermonDate={sermonDate}
            transcript={transcript}
            days={previewDays}
            onDaysChange={setPreviewDays}
            disabled={generating || publishing || submitting}
          />

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
