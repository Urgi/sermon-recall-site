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
    <div
      className="rounded-xl border border-[rgba(56,189,248,0.2)] bg-[#0a0f18] p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium uppercase tracking-wide text-[#64748b]">
          Progress (estimate)
        </span>
        <span className="tabular-nums text-[12px] text-[#94a3b8]">{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1e293b]">
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-[14px] font-medium text-sky-100">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#94a3b8]">{detail}</p>
      <p className="mt-2 text-[12px] text-[#64748b]">
        Time on this step: {formatStepElapsed(phaseStartedAt)}
      </p>
    </div>
  );
}
