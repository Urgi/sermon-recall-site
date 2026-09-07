'use client';

import { DevotionalGenerationHints } from '@/components/admin/DevotionalGenerationHints';
import { DevotionalPreviewReviewList } from '@/components/admin/DevotionalPreviewReviewList';
import { SermonTranscriptUpload } from '@/components/admin/SermonTranscriptUpload';
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
  devotionalPreviewLockedHint,
} from '@/lib/admin/workflow-status';
import { firstDevotionalAvailableLabel, pastorDisplayName } from '@/lib/admin/sermon-wizard';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

function MemberGoLiveSummary({ sermonDate }: { sermonDate: string }) {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[color-mix(in_srgb,var(--admin-accent)_8%,var(--admin-card-bg))] px-4 py-3">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--admin-dim)]">
            Goes to
          </dt>
          <dd className="mt-0.5 text-[13px] font-medium leading-snug text-[var(--admin-fg-strong)]">
            All members registered in the church
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--admin-dim)]">
            First devotional
          </dt>
          <dd className="mt-0.5 text-[13px] font-medium leading-snug text-[var(--admin-fg-strong)]">
            Available {firstDevotionalAvailableLabel(sermonDate)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

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
  canApprove: boolean;
  churchPastorName: string | null;
  onPreviewDaysChange?: (days: DevotionalDay[] | null) => void;
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
  canApprove,
  churchPastorName,
  onPreviewDaysChange,
}: Props) {
  const router = useRouter();
  const [previewDays, setPreviewDays] = useState<DevotionalDay[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingStartedAt, setGeneratingStartedAt] = useState<number | null>(null);
  const [transcriptionJobId, setTranscriptionJobId] = useState<string | null>(null);
  const [jobLookupDone, setJobLookupDone] = useState(false);
  const [sourceFailed, setSourceFailed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoGenerateAttempted = useRef(false);

  const canRegen = canRegenerateWorkflow(workflowStatus);

  useEffect(() => {
    onPreviewDaysChange?.(previewDays);
  }, [onPreviewDaysChange, previewDays]);

  useEffect(() => {
    const stored = loadPreviewDays(sermonId);
    if (stored?.length === 6) {
      setPreviewDays(stored);
      autoGenerateAttempted.current = true;
    }
  }, [sermonId]);

  useEffect(() => {
    if (hasTranscript || hasExistingDevotionals) {
      setJobLookupDone(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/transcription/jobs?sermonId=${encodeURIComponent(sermonId)}`,
        { credentials: 'include' },
      );
      const json = (await res.json()) as { job?: { id: string; status: string } | null };
      if (cancelled) return;
      if (json.job?.id && json.job.status !== 'completed') {
        setTranscriptionJobId(json.job.id);
        if (json.job.status === 'failed') setSourceFailed(true);
      }
      setJobLookupDone(true);
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
        if (res.status === 409) return;
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

  async function submitDays(days: DevotionalDay[]): Promise<boolean> {
    const res = await fetch('/api/devotionals/submit-for-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        sermonId,
        days,
        replace: hasExistingDevotionals,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Submit failed.');
      return false;
    }
    return true;
  }

  async function submitForApproval() {
    if (!previewDays?.length) return;
    setError(null);
    setSubmitting(true);
    try {
      const ok = await submitDays(previewDays);
      if (!ok) return;
      setPreviewDays(null);
      clearPreviewDays(sermonId);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function approveNow() {
    setError(null);
    setSubmitting(true);
    try {
      if (previewDays?.length && canSubmitForApproval(workflowStatus)) {
        const ok = await submitDays(previewDays);
        if (!ok) return;
        clearPreviewDays(sermonId);
      }
      const res = await fetch('/api/devotionals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ sermonId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Approve failed.');
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
    clearPreviewDays(sermonId);
    setPreviewDays(null);
    setError(null);
  }

  const awaitingTranscript = !hasTranscript && !hasExistingDevotionals;
  const hasActiveJob = awaitingTranscript && Boolean(transcriptionJobId);
  const pipelineActive = hasActiveJob && !sourceFailed;
  const showSourceRecovery = awaitingTranscript && jobLookupDone && !pipelineActive;
  const approver = pastorDisplayName(churchPastorName);
  const canSendForApproval =
    approvalRequired && canSubmit && !canApprove && canSubmitForApproval(workflowStatus);
  const canApproveHere =
    approvalRequired &&
    canApprove &&
    (workflowStatus === 'submitted_for_approval' ||
      (Boolean(previewDays?.length) && canSubmitForApproval(workflowStatus)));
  const showGoLiveSummary = canApproveHere || (!approvalRequired && canPublish);

  return (
    <div className="space-y-4">
      {workflowStatus === 'approved' && canPublish ? (
        <div className="space-y-3">
          <MemberGoLiveSummary sermonDate={sermonDate} />
          <button
            type="button"
            onClick={() => void publishApproved()}
            disabled={publishing}
            className="admin-btn-primary rounded-full px-6"
          >
            {publishing ? 'Publishing…' : 'Publish to app'}
          </button>
        </div>
      ) : null}

      {!approvalRequired &&
      canPublish &&
      hasExistingDevotionals &&
      workflowStatus !== 'published' &&
      workflowStatus !== 'approved' ? (
        <div className="space-y-3">
          <MemberGoLiveSummary sermonDate={sermonDate} />
          <button
            type="button"
            onClick={() => void publishApproved()}
            disabled={publishing}
            className="admin-btn-primary rounded-full px-6"
          >
            {publishing ? 'Publishing…' : 'Publish to app'}
          </button>
        </div>
      ) : null}

      {workflowStatus === 'submitted_for_approval' && !canApprove ? (
        <div className="admin-card p-4" role="status">
          <p className="text-[14px] font-medium text-[var(--admin-fg-strong)]">
            Sent to {approver}
          </p>
          <p className="admin-hint mt-2 leading-relaxed">
            {approver} needs to approve these devotionals before members see them in the app.
          </p>
        </div>
      ) : null}

      {workflowStatus === 'submitted_for_approval' && canApprove && !previewDays ? (
        <div className="space-y-3">
          <MemberGoLiveSummary sermonDate={sermonDate} />
          <button
            type="button"
            onClick={() => void approveNow()}
            disabled={submitting}
            className="admin-btn-primary rounded-full px-6"
          >
            {submitting ? 'Approving…' : 'Approve'}
          </button>
        </div>
      ) : null}

      {hasActiveJob ? (
        <TranscriptionJobPoller
          jobId={transcriptionJobId!}
          sermonId={sermonId}
          generateDevotionalsAfter={canRegen}
          onPreviewReady={(days) => setPreviewDays(days)}
          onComplete={() => router.refresh()}
          onFailed={() => setSourceFailed(true)}
        />
      ) : null}

      {showSourceRecovery ? (
        <SermonTranscriptUpload sermonId={sermonId} />
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
        <div
          className="rounded-lg border border-[#38bdf8]/25 bg-[#05070a]/40 px-4 py-3"
          role="status"
        >
          <p className="text-[13px] leading-relaxed text-[var(--admin-fg)]/85">
            {devotionalPreviewLockedHint(workflowStatus)}
          </p>
        </div>
      ) : null}

      {previewDays ? (
        <div className="admin-card space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-violet-600 dark:text-violet-200">
                Preview (not live yet)
              </p>
              <p className="admin-hint mt-1">
                {canApprove
                  ? 'Edit anything that needs a pastor’s voice, then approve on this screen.'
                  : `Edit if needed, then send to ${approver} for approval.`}
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

          {canSendForApproval ? (
            <p className="rounded-xl border border-[var(--admin-border)] bg-[color-mix(in_srgb,var(--admin-accent)_8%,var(--admin-card-bg))] p-4 text-[13px] leading-relaxed text-[var(--admin-fg)]">
              Send this to {approver} for approval. Members won’t see these devotionals until{' '}
              {approver} approves them.
            </p>
          ) : null}

          {showGoLiveSummary ? <MemberGoLiveSummary sermonDate={sermonDate} /> : null}

          <div className="flex flex-wrap gap-3 pt-1">
            {canApproveHere ? (
              <button
                type="button"
                onClick={() => void approveNow()}
                disabled={submitting || generating}
                className="admin-btn-primary rounded-full px-6"
              >
                {submitting ? 'Approving…' : 'Approve'}
              </button>
            ) : null}
            {canSendForApproval ? (
              <button
                type="button"
                onClick={() => void submitForApproval()}
                disabled={submitting || generating}
                className="admin-btn-primary rounded-full px-6"
              >
                {submitting ? 'Sending…' : 'Send for approval'}
              </button>
            ) : null}
            {!approvalRequired && canPublish ? (
              <button
                type="button"
                onClick={() => void publish()}
                disabled={publishing || generating}
                className="admin-btn-primary rounded-full px-6"
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
