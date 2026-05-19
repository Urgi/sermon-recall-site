'use client';

import { useState } from 'react';

import { DevotionalGenerationHints } from '@/components/admin/DevotionalGenerationHints';
import { GeminiPreviewDayEditor } from '@/components/admin/GeminiPreviewDayEditor';
import type { GeminiDevotionalDay } from '@/lib/gemini/devotional-days';
import { parseDaysFromClientPayload } from '@/lib/gemini/devotional-days';

type Props = {
  churchId: string;
  sermonTitle: string;
  pastorName: string;
  sermonDate: string;
  transcript: string;
  days: GeminiDevotionalDay[];
  onDaysChange: (next: GeminiDevotionalDay[]) => void;
  onBack: () => void;
  finishing: boolean;
  onAddSermon: () => void | Promise<void>;
};

function MemberDayPreview({ day, sermonTitle }: { day: GeminiDevotionalDay; sermonTitle: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-[#050a08] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
        Member preview
      </p>
      <p className="text-[12px] text-admin-dim">{sermonTitle}</p>
      <p className="text-[16px] font-semibold text-admin-fg-strong">{day.title}</p>
      <p className="text-[13px] leading-relaxed text-amber-100/90">
        <span className="font-medium text-admin-muted">Before you read: </span>
        {day.pre_prompt}
      </p>
      {day.scripture_reference ? (
        <p className="text-[14px] font-medium text-sky-300">{day.scripture_reference}</p>
      ) : null}
      {day.scripture_text ? (
        <p className="text-[13px] leading-relaxed text-admin-fg-secondary whitespace-pre-wrap">
          {day.scripture_text}
        </p>
      ) : null}
      <div className="text-[14px] leading-relaxed text-admin-fg whitespace-pre-wrap">
        {day.main_content}
      </div>
      <p className="text-[14px] leading-relaxed text-violet-200/95">
        <span className="font-medium text-admin-dim">Reflect: </span>
        {day.reflection_question}
      </p>
      <p className="text-[11px] text-admin-dim">About {day.estimated_minutes} min read</p>
    </div>
  );
}

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
  const [regenPrompt, setRegenPrompt] = useState<Record<number, string>>({});
  const [regenBusyDay, setRegenBusyDay] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function patchDay(dayNumber: number, patch: Partial<GeminiDevotionalDay>) {
    onDaysChange(days.map((d) => (d.day_number === dayNumber ? { ...d, ...patch } : d)));
  }

  async function regenerateDay(day: GeminiDevotionalDay) {
    const instruction = (regenPrompt[day.day_number] ?? '').trim();
    if (!instruction) {
      setLocalError(`Add a short instruction for Day ${day.day_number} before regenerating.`);
      return;
    }
    setLocalError(null);
    setRegenBusyDay(day.day_number);
    try {
      const siblingPrePrompts = days
        .filter((d) => d.day_number !== day.day_number)
        .map((d) => d.pre_prompt);
      const res = await fetch('/api/regenerate-devotional-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          churchId,
          title: sermonTitle,
          pastorName: pastorName.trim() || null,
          sermonDate: sermonDate.trim() || null,
          transcript,
          day,
          instruction,
          siblingPrePrompts,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        day?: GeminiDevotionalDay;
      };
      if (!res.ok) {
        setLocalError(
          data.hint ? `${data.error ?? 'Regenerate failed.'} ${data.hint}` : (data.error ?? 'Regenerate failed.'),
        );
        return;
      }
      if (!data.day) {
        setLocalError('Unexpected response from server.');
        return;
      }
      onDaysChange(days.map((d) => (d.day_number === data.day!.day_number ? data.day! : d)));
    } finally {
      setRegenBusyDay(null);
    }
  }

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
          This is roughly what members see before their daily read. Regenerate any day with a
          prompt, or expand <span className="text-admin-muted">Edit fields</span> to tweak text
          directly. When you are satisfied, use <span className="text-admin-muted">Add sermon</span>{' '}
          to save the sermon and publish these devotionals to the app.
        </p>
      </div>

      <ul className="space-y-6">
        {days.map((d, idx) => (
          <li
            key={d.day_number}
            className="rounded-xl border border-admin bg-admin-surface/80 p-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
              Day {d.day_number}
            </p>
            <div className="mt-3 space-y-4">
              <MemberDayPreview day={d} sermonTitle={sermonTitle} />

              <div>
                <label className="block text-[13px] font-medium text-admin-muted">
                  Regenerate this day (optional prompt for Gemini)
                </label>
                <textarea
                  value={regenPrompt[d.day_number] ?? ''}
                  onChange={(e) =>
                    setRegenPrompt((prev) => ({ ...prev, [d.day_number]: e.target.value }))
                  }
                  rows={2}
                  maxLength={1200}
                  placeholder="e.g. Shorter paragraphs, more on prayer, gentler tone…"
                  className="mt-1 w-full resize-y rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 text-[14px] leading-relaxed text-admin-fg outline-none ring-sky-400/40 focus:border-[#38bdf8] focus:ring-2"
                />
                <button
                  type="button"
                  disabled={regenBusyDay !== null || finishing}
                  onClick={() => void regenerateDay(d)}
                  className="mt-2 rounded-lg border border-violet-500/40 bg-violet-950/30 px-3 py-2 text-[13px] font-medium text-violet-200 hover:bg-violet-900/40 disabled:opacity-50"
                >
                  {regenBusyDay === d.day_number ? 'Regenerating…' : 'Regenerate with Gemini'}
                </button>
              </div>

              <details className="rounded-lg border border-[rgba(56,189,248,0.1)] bg-[#030508]">
                <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium text-admin-muted hover:text-sky-300">
                  Edit fields directly
                </summary>
                <div className="border-t border-[rgba(56,189,248,0.08)] p-3">
                  <GeminiPreviewDayEditor
                    variant="block"
                    sermonTitle={sermonTitle}
                    day={d}
                    defaultOpen={idx === 0}
                    onPatch={(patch) => patchDay(d.day_number, patch)}
                  />
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>

      <DevotionalGenerationHints
        active={regenBusyDay !== null}
        variant="single-day"
        intervalMs={2400}
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
          disabled={finishing || regenBusyDay !== null}
          className="admin-btn admin-btn-primary"
        >
          {finishing ? 'Saving…' : 'Add sermon'}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={finishing || regenBusyDay !== null}
          className="rounded-lg border border-admin-strong px-4 py-2.5 text-[15px] text-admin-muted hover:bg-admin-card disabled:opacity-50"
        >
          Back to details
        </button>
      </div>
    </div>
  );
}
