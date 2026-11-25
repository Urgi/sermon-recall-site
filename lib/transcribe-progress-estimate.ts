import { tr } from '@/lib/i18n/ui';

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
      title: tr('prog.upload'),
      detail:
        phaseElapsedSec < 1
          ? tr('prog.sending')
          : tr('prog.uploadWait'),
    };
  }

  if (phase === 'devotionals') {
    const est = estimateDevotionalSeconds();
    const t = Math.min(1, phaseElapsedSec / est);
    const percent = 62 + Math.floor(t * 37);
    const remaining = Math.max(0, est - phaseElapsedSec);

    let detail: string;
    if (phaseElapsedSec < 3) {
      detail = tr('prog.drafting');
    } else if (remaining > 20) {
      detail = tr('prog.leftRange', { a: fmtSec(remaining * 0.6), b: fmtSec(remaining * 1.1) });
    } else if (remaining > 5) {
      detail = tr('prog.left', { a: fmtSec(remaining) });
    } else if (remaining > 0) {
      detail = tr('prog.almostDraft');
    } else {
      detail = tr('prog.stillDraft');
    }

    return {
      percent: Math.min(percent, 99),
      title: tr('prog.draftTitle'),
      detail,
    };
  }

  const est = estimateTranscribeSeconds(fileBytes);
  const t = Math.min(1, phaseElapsedSec / est);
  const percent = 18 + Math.floor(t * 44);
  const remaining = Math.max(0, est - phaseElapsedSec);

  let detail: string;
  if (phaseElapsedSec < 3) {
    detail = tr('prog.transPreparing');
  } else if (remaining > 60) {
    detail = tr('prog.transRange', { a: fmtSec(remaining * 0.5), b: fmtSec(remaining * 1.2) });
  } else if (remaining > 10) {
    detail = tr('prog.left', { a: fmtSec(remaining) });
  } else if (remaining > 0) {
    detail = tr('prog.almostTrans');
  } else {
    detail = tr('prog.stillTrans');
  }

  return {
    percent: Math.min(percent, 61),
    title: tr('prog.transTitle'),
    detail,
  };
}
