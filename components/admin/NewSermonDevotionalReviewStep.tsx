'use client';

import { useState } from 'react';

import { DevotionalPreviewReviewList } from '@/components/admin/DevotionalPreviewReviewList';
import type { DevotionalDay } from '@/lib/devotionals/devotional-days';
import { parseDaysFromClientPayload } from '@/lib/devotionals/devotional-days';

type Props = {
  churchId: string;
  sermonTitle: string;
  pastorName: string;
  sermonDate: string;
  transcript: string;
  days: DevotionalDay[];
  onDaysChange: (next: DevotionalDay[]) => void;
  onBack: () => void;
  finishing: boolean;
  onAddSermon: () => void | Promise<void>;
};

export function NewSermonDevotionalReviewStep({
  churchId,
  sermonTitle,
  pastorName,
  sermonDate,
  transcript,
  days,
  onDaysChange,
  onBack,
  finishing,
  onAddSermon,
}: Props) {
  const [localError, setLocalError] = useState<string | null>(null);

  function tryAddSermon() {
    setLocalError(null);
    try {
      parseDaysFromClientPayload(days);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid devotionals.';
      setLocalError(`${msg} Adjust the days or regenerate, then try again.`);
      return;
    }
    void onAddSermon();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-500/25 bg-admin-card p-5">
        <p className="text-[15px] font-semibold text-violet-200">Review six-day journey</p>
        <p className="mt-1 text-[13px] leading-relaxed text-admin-dim">
          Expand each day to preview, edit, or regenerate with AI. When you are satisfied, save the
          sermon — nothing goes live to members until published.
        </p>
      </div>

      <DevotionalPreviewReviewList
        churchId={churchId}
        sermonTitle={sermonTitle}
        pastorName={pastorName}
        sermonDate={sermonDate}
        transcript={transcript}
        days={days}
        onDaysChange={onDaysChange}
        disabled={finishing}
      />

      {localError ? (
        <p className="text-[13px] text-red-400" role="alert">
          {localError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => void tryAddSermon()}
          disabled={finishing}
          className="admin-btn admin-btn-primary"
        >
          {finishing ? 'Saving…' : 'Add sermon'}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={finishing}
          className="rounded-lg border border-admin-strong px-4 py-2.5 text-[15px] text-admin-muted hover:bg-admin-card disabled:opacity-50"
        >
          Back to details
        </button>
      </div>
    </div>
  );
}
