'use client';

import type { ReactNode } from 'react';

import {
  SERMON_WIZARD_STEP_COUNT,
  sermonWizardStepIndex,
  type SermonWizardStep,
} from '@/lib/admin/sermon-wizard';

type Props = {
  step: SermonWizardStep;
  title: string;
  hint?: string;
  context?: string | null;
  action?: ReactNode;
  onBack: () => void;
};

export function SermonWizardProgress({ step, title, hint, context, action, onBack }: Props) {
  const index = sermonWizardStepIndex(step);
  const pct = Math.round(((index + 1) / SERMON_WIZARD_STEP_COUNT) * 100);

  return (
    <div>
      <p className="text-[13px] font-semibold tracking-tight text-[var(--admin-fg-strong)]">
        New sermon
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--admin-border-strong)] bg-[var(--admin-surface-bg)] text-[var(--admin-fg-strong)] hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)]"
        >
          <span aria-hidden className="text-base leading-none">
            ‹
          </span>
        </button>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--admin-border-strong)]"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={SERMON_WIZARD_STEP_COUNT}
          aria-valuenow={index + 1}
          aria-label={`Step ${index + 1} of ${SERMON_WIZARD_STEP_COUNT}`}
        >
          <div
            className="h-full rounded-full bg-[#0ea5e9] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="mt-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--admin-dim)]">
          Step {index + 1} of {SERMON_WIZARD_STEP_COUNT}
        </p>
        <div className="mt-1.5 flex items-start justify-between gap-4">
          <h1 className="min-w-0 text-[1.375rem] font-bold leading-tight tracking-tight text-[var(--admin-fg-strong)]">
            {title}
          </h1>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {hint ? (
          <p className="admin-hint mt-1.5 max-w-xl text-[13px] leading-snug">{hint}</p>
        ) : null}
        {context ? (
          <p className="mt-1.5 truncate text-[13px] font-medium text-[var(--admin-fg-strong)]">
            {context}
          </p>
        ) : null}
      </div>
    </div>
  );
}
