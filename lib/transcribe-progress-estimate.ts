/**
 * Groq / worker pipeline has no fine-grained progress API. Heuristic for upload vs transcribe phases.
 */

export type TranscribePhase = 'upload' | 'transcribe' | 'devotionals';

export type TranscribeProgressView = {
  percent: number;
  title: string;
  detail: string;
};

function fmtSec(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

/** Expected transcribe-only duration (seconds) — Groq worker path is much faster than legacy Whisper. */
export function estimateTranscribeSeconds(fileBytes: number): number {
  const mb = fileBytes / (1024 * 1024);
  return Math.round(Math.max(20, Math.min(180, 12 + mb * 3)));
}

/** Expected six-day preview generation (seconds). */
export function estimateDevotionalSeconds(): number {
  return 55;
}

export function buildTranscribeProgressView(
  phase: TranscribePhase,
  phaseElapsedSec: number,
  fileBytes: number,
): TranscribeProgressView {
  if (phase === 'upload') {
    const p = Math.min(18, 3 + Math.floor(phaseElapsedSec * 5));
    return {
      percent: p,
      title: 'Uploading file',
      detail:
        phaseElapsedSec < 1
          ? 'Sending to storage…'
          : 'Upload in progress — usually a few seconds.',
    };
  }

  if (phase === 'devotionals') {
    const est = estimateDevotionalSeconds();
    const t = Math.min(1, phaseElapsedSec / est);
    const percent = 62 + Math.floor(t * 37);
    const remaining = Math.max(0, est - phaseElapsedSec);

    let detail: string;
    if (phaseElapsedSec < 3) {
      detail = 'Drafting all six days from your sermon…';
    } else if (remaining > 20) {
      detail = `Often about ${fmtSec(remaining * 0.6)}–${fmtSec(remaining * 1.1)} left (estimate).`;
    } else if (remaining > 5) {
      detail = `Often about ${fmtSec(remaining)} left (estimate).`;
    } else if (remaining > 0) {
      detail = 'Almost done — polishing the six-day preview…';
    } else {
      detail = 'Still generating — complex sermons can take a little longer.';
    }

    return {
      percent: Math.min(percent, 99),
      title: 'Building six-day preview',
      detail,
    };
  }

  const est = estimateTranscribeSeconds(fileBytes);
  const t = Math.min(1, phaseElapsedSec / est);
  const percent = 18 + Math.floor(t * 44);
  const remaining = Math.max(0, est - phaseElapsedSec);

  let detail: string;
  if (phaseElapsedSec < 3) {
    detail = 'Worker is preparing and transcribing with Groq…';
  } else if (remaining > 60) {
    detail = `Often ${fmtSec(remaining * 0.5)}–${fmtSec(remaining * 1.2)} left (YouTube downloads take longer).`;
  } else if (remaining > 10) {
    detail = `Often about ${fmtSec(remaining)} left (estimate).`;
  } else if (remaining > 0) {
    detail = 'Almost done — wrapping up…';
  } else {
    detail = 'Still processing — large files or YouTube can exceed the estimate.';
  }

  return {
    percent: Math.min(percent, 61),
    title: 'Transcribing sermon',
    detail,
  };
}
