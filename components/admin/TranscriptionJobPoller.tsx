'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { DevotionalGenerationHints } from '@/components/admin/DevotionalGenerationHints';
import { TranscribeProgressPanel } from '@/components/admin/TranscribeProgressPanel';
import type { DevotionalDay } from '@/lib/devotionals/devotional-days';
import { savePreviewDays } from '@/lib/devotionals/preview-session';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { localizeApiError, withApiHint } from '@/lib/i18n/api-errors';
import { tr } from '@/lib/i18n/ui';
import { useProgressTick } from '@/lib/hooks/useProgressTick';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

type Job = {
  id: string;
  status: JobStatus;
  source_type?: 'storage' | 'youtube';
  chunks_done: number;
  chunks_total: number;
  error_message: string | null;
};

type PipelinePhase = 'transcribe' | 'devotionals' | 'done';

type Props = {
  jobId: string;
  fileBytes?: number;
  sermonId?: string;
  /** After transcription, build the six-day preview on the same progress bar. Default true when sermonId is set. */
  generateDevotionalsAfter?: boolean;
  onComplete?: () => void;
  onPreviewReady?: (days: DevotionalDay[]) => void;
  onFailed?: () => void;
};

function formatElapsed(startMs: number): string {
  const s = Math.floor((Date.now() - startMs) / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `${r}s`;
}

export function TranscriptionJobPoller({
  jobId,
  fileBytes = 50 * 1024 * 1024,
  sermonId,
  generateDevotionalsAfter,
  onComplete,
  onPreviewReady,
  onFailed,
}: Props) {
  const router = useRouter();
  const { t } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>('transcribe');
  const [devotionalsStartedAt, setDevotionalsStartedAt] = useState<number | null>(null);
  const [transcribeStartedAt] = useState(() => Date.now());
  const generationStarted = useRef(false);

  const shouldGenerateDevotionals =
    Boolean(sermonId) && (generateDevotionalsAfter ?? true);

  useProgressTick(Boolean(job && (job.status === 'pending' || pipelinePhase === 'devotionals')));

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/transcription/jobs?jobId=${encodeURIComponent(jobId)}`, {
          credentials: 'include',
        });
        const json = (await res.json()) as { job?: Job; error?: string };
        if (cancelled) return;
        if (!res.ok || !json.job) {
          setError(json.error ? localizeApiError(json.error) : tr('job.err.status'));
          return;
        }
        setJob(json.job);
        if (json.job.status === 'completed') {
          if (shouldGenerateDevotionals && pipelinePhase === 'transcribe') {
            setPipelinePhase('devotionals');
            setDevotionalsStartedAt(Date.now());
            return;
          }
          onComplete?.();
          router.refresh();
          return;
        }
        if (json.job.status === 'failed') {
          setError(tr('job.err.failed'));
          onFailed?.();
          return;
        }
        timer = setTimeout(() => void poll(), 2000);
      } catch {
        if (!cancelled) {
          setError(tr('job.err.network'));
        }
      }
    }

    if (pipelinePhase === 'transcribe') {
      void poll();
    }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, onComplete, onFailed, pipelinePhase, router, shouldGenerateDevotionals]);

  useEffect(() => {
    if (pipelinePhase !== 'devotionals' || !sermonId || generationStarted.current) return;
    generationStarted.current = true;
    let cancelled = false;

    void (async () => {
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
        if (cancelled) return;
        if (res.status === 409) {
          setPipelinePhase('done');
          onComplete?.();
          router.refresh();
          return;
        }
        if (!res.ok || !data.days?.length) {
          const msg = data.error ? localizeApiError(data.error) : tr('job.err.genFailed');
          setError(withApiHint(msg, data.hint));
          return;
        }
        savePreviewDays(sermonId, data.days);
        onPreviewReady?.(data.days);
        setPipelinePhase('done');
        onComplete?.();
        router.refresh();
      } catch {
        if (!cancelled) {
          setError(tr('job.err.genNetwork'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onComplete, onPreviewReady, pipelinePhase, router, sermonId]);

  if (error) {
    const youtubeDown =
      job?.source_type === 'youtube' ||
      /YouTube is temporarily down|Ref YT-/i.test(error);
    if (youtubeDown) {
      return (
        <div className="admin-card space-y-2 p-4" role="alert">
          <p className="text-[14px] font-medium text-[var(--admin-fg-strong)]">
            {t('job.ytDown')}
          </p>
          <p className="admin-hint leading-relaxed">{t('job.ytDownMsg')}</p>
          <p className="admin-hint leading-relaxed">
            {t('job.ytUse')}
          </p>
        </div>
      );
    }
    return (
      <p className="text-[13px] text-red-500 dark:text-red-400" role="alert">
        {error}
      </p>
    );
  }

  if (pipelinePhase === 'devotionals' && devotionalsStartedAt != null) {
    return (
      <div className="space-y-2">
        <TranscribeProgressPanel
          phase="devotionals"
          phaseStartedAt={devotionalsStartedAt}
          fileBytes={fileBytes}
        />
        <DevotionalGenerationHints active variant="six-day" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="admin-card p-4" role="status">
        <p className="text-[14px] font-medium text-[var(--admin-accent)]">{t('job.queuing')}</p>
      </div>
    );
  }

  if (job.status === 'completed' || pipelinePhase === 'done') {
    return (
      <p className="text-[13px] text-emerald-600 dark:text-emerald-400" role="status">
        {t('job.ready')}
      </p>
    );
  }

  if (job.status === 'pending') {
    return (
      <div className="admin-card p-4 space-y-2" role="status">
        <p className="text-[14px] font-medium text-[var(--admin-accent)]">{t('job.queued')}</p>
        <p className="admin-hint text-[13px] leading-relaxed">
          {t('job.queuedHint')}
        </p>
        <p className="admin-hint text-[13px]">
          {t('job.waiting', { t: formatElapsed(transcribeStartedAt) })}
        </p>
      </div>
    );
  }

  const chunkHint =
    job.chunks_total > 1 ? t('job.chunk', { a: job.chunks_done, b: job.chunks_total }) : '';

  return (
    <div className="space-y-2">
      <TranscribeProgressPanel
        phase="transcribe"
        phaseStartedAt={transcribeStartedAt}
        fileBytes={fileBytes}
      />
      <p className="admin-hint text-[13px]">
        {chunkHint}
        {t('job.transcribing')}
      </p>
    </div>
  );
}
