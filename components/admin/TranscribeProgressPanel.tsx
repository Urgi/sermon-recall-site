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
  children?: React.ReactNode;
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
  children,
}: TranscribeProgressPanelProps) {
  useProgressTick(true);
  const phaseSec = (Date.now() - phaseStartedAt) / 1000;
  const { percent, title, detail } = buildTranscribeProgressView(phase, phaseSec, fileBytes);

  return (
    <div className="admin-card p-5" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="admin-stat-label">Progress (estimate)</span>
        <span className="admin-hint tabular-nums font-medium">{percent}%</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3.5 text-[15px] font-semibold text-[var(--admin-accent)]">{title}</p>
      <p className="admin-hint mt-1 leading-relaxed">{detail}</p>
      <p className="admin-hint mt-2 text-[12px]">
        Time on this step: {formatStepElapsed(phaseStartedAt)}
      </p>
      {children ? (
        <div className="mt-3.5 border-t border-[var(--admin-border)] pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
