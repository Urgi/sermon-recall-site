'use client';

import { useProgressTick } from '@/lib/hooks/useProgressTick';
import {
  buildTranscribeProgressView,
  type TranscribePhase,
} from '@/lib/transcribe-progress-estimate';

export type TranscribeProgressPanelProps = {
  phase: TranscribePhase;
  phaseStartedAt: number;
  fileBytes: number;
};

function formatStepElapsed(startMs: number) {
  const s = Math.floor((Date.now() - startMs) / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `${r}s`;
}

export function TranscribeProgressPanel({
  phase,
  phaseStartedAt,
  fileBytes,
}: TranscribeProgressPanelProps) {
  useProgressTick(true);
  const phaseSec = (Date.now() - phaseStartedAt) / 1000;
  const { percent, title, detail } = buildTranscribeProgressView(phase, phaseSec, fileBytes);

  return (
    <div className="admin-card p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="admin-stat-label">Progress (estimate)</span>
        <span className="admin-hint tabular-nums">{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--admin-nav-hover-bg)]">
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-[14px] font-medium text-[var(--admin-accent)]">{title}</p>
      <p className="admin-hint mt-1 leading-relaxed">{detail}</p>
      <p className="admin-hint mt-2">
        Time on this step: {formatStepElapsed(phaseStartedAt)}
      </p>
    </div>
  );
}
