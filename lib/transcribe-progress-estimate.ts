/**
 * OpenAI /audio/transcriptions has no progress API. We surface upload vs transcribe phases
 * and a time+size-based estimate so the UI isn't a silent spinner.
 */

export type TranscribePhase = 'upload' | 'transcribe';

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

/**
 * Expected transcribe-only duration (seconds), clamped. Tunable heuristic.
 */
export function estimateTranscribeSeconds(fileBytes: number): number {
  const mb = fileBytes / (1024 * 1024);
  return Math.round(Math.max(25, Math.min(600, 18 + mb * 22)));
}

export function buildTranscribeProgressView(
  phase: TranscribePhase,
  phaseElapsedSec: number,
  fileBytes: number,
): TranscribeProgressView {
  if (phase === 'upload') {
    const p = Math.min(22, 3 + Math.floor(phaseElapsedSec * 6));
    return {
      percent: p,
      title: 'Uploading file',
      detail:
        phaseElapsedSec < 1
          ? 'Sending to storage…'
          : 'Upload in progress — usually a few seconds.',
    };
  }

  const est = estimateTranscribeSeconds(fileBytes);
  const t = Math.min(1, phaseElapsedSec / est);
  const percent = 22 + Math.floor(t * 77);
  const remaining = Math.max(0, est - phaseElapsedSec);

  let detail: string;
  if (phaseElapsedSec < 3) {
    detail = 'Starting Whisper transcription on the server…';
  } else if (remaining > 90) {
    detail = `Rough guess: ${fmtSec(remaining * 0.7)}–${fmtSec(remaining * 1.4)} left (depends on load).`;
  } else if (remaining > 15) {
    detail = `Often about ${fmtSec(remaining)} left (estimate).`;
  } else if (remaining > 0) {
    detail = 'Almost done — wrapping up…';
  } else {
    detail = 'Still processing — long files can exceed the estimate.';
  }

  return {
    percent: Math.min(percent, 99),
    title: 'Transcribing with OpenAI',
    detail,
  };
}
