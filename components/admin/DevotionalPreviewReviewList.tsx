'use client';

import { useEffect, useState } from 'react';

import { DevotionalGenerationHints } from '@/components/admin/DevotionalGenerationHints';
import type { DevotionalDay } from '@/lib/devotionals/devotional-days';
import {
  countBodyParagraphs,
  MIN_BODY_PARAGRAPHS,
  validateBodyParagraphs,
} from '@/lib/devotionals/devotional-days';

type ModalProps = {
  day: DevotionalDay;
  sermonTitle: string;
  churchId: string;
  pastorName: string;
  sermonDate: string;
  transcript: string;
  siblingPrePrompts: string[];
  onClose: () => void;
  onDayChange: (day: DevotionalDay) => void;
  disabled?: boolean;
};

function DevotionalDayReviewModal({
  day,
  sermonTitle,
  churchId,
  pastorName,
  sermonDate,
  transcript,
  siblingPrePrompts,
  onClose,
  onDayChange,
  disabled = false,
}: ModalProps) {
  const [title, setTitle] = useState(day.title);
  const [prePrompt, setPrePrompt] = useState(day.pre_prompt);
  const [mainContent, setMainContent] = useState(day.main_content);
  const [reflectionQuestion, setReflectionQuestion] = useState(day.reflection_question);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingPrePrompt, setEditingPrePrompt] = useState(false);
  const [editingMainContent, setEditingMainContent] = useState(false);
  const [editingReflection, setEditingReflection] = useState(false);
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [regenBusy, setRegenBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(day.title);
    setPrePrompt(day.pre_prompt);
    setMainContent(day.main_content);
    setReflectionQuestion(day.reflection_question);
    setEditingTitle(false);
    setEditingPrePrompt(false);
    setEditingMainContent(false);
    setEditingReflection(false);
    setShowRegenPrompt(false);
    setRegenInstruction('');
    setError(null);
  }, [
    day.day_number,
    day.title,
    day.pre_prompt,
    day.main_content,
    day.reflection_question,
  ]);

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Title cannot be empty.');
      return;
    }
    onDayChange({ ...day, title: trimmed });
    setEditingTitle(false);
    setError(null);
  }

  function savePrePrompt() {
    const trimmed = prePrompt.trim();
    if (!trimmed) {
      setError('“Before you read” cannot be empty.');
      return;
    }
    onDayChange({ ...day, pre_prompt: trimmed });
    setEditingPrePrompt(false);
    setError(null);
  }

  function saveMainContent() {
    const trimmed = mainContent.trim();
    if (!trimmed) {
      setError('Body cannot be empty.');
      return;
    }
    const paragraphError = validateBodyParagraphs(trimmed);
    if (paragraphError) {
      setError(paragraphError);
      return;
    }
    onDayChange({ ...day, main_content: trimmed });
    setEditingMainContent(false);
    setError(null);
  }

  function saveReflection() {
    const trimmed = reflectionQuestion.trim();
    if (!trimmed) {
      setError('Reflection question cannot be empty.');
      return;
    }
    onDayChange({ ...day, reflection_question: trimmed });
    setEditingReflection(false);
    setError(null);
  }

  async function regenerateBody() {
    const instruction = regenInstruction.trim();
    if (!instruction) {
      setError('Describe what you want changed before regenerating.');
      return;
    }
    setError(null);
    setRegenBusy(true);
    try {
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
        day?: DevotionalDay;
      };
      if (!res.ok) {
        setError(
          data.hint ? `${data.error ?? 'Regenerate failed.'} ${data.hint}` : (data.error ?? 'Regenerate failed.'),
        );
        return;
      }
      if (!data.day) {
        setError('Unexpected response from server.');
        return;
      }
      onDayChange(data.day);
      setShowRegenPrompt(false);
      setRegenInstruction('');
    } finally {
      setRegenBusy(false);
    }
  }

  const editingBodyParagraphCount = editingMainContent ? countBodyParagraphs(mainContent) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="devotional-day-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !regenBusy) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-admin bg-[#0a0f18] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-admin px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
            Day {day.day_number}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={regenBusy}
            className="rounded-lg px-2 py-1 text-[13px] text-admin-muted hover:bg-admin-surface hover:text-admin-fg-strong"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <div className="flex items-start justify-between gap-2">
              {editingTitle ? (
                <input
                  id="devotional-day-modal-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') {
                      setTitle(day.title);
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                  maxLength={600}
                  className="min-w-0 flex-1 rounded-lg border border-[#38bdf8]/40 bg-[#05070a] px-3 py-2 text-[18px] font-semibold text-white outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              ) : (
                <h3
                  id="devotional-day-modal-title"
                  className="text-[18px] font-semibold leading-snug text-admin-fg-strong"
                >
                  {day.title}
                </h3>
              )}
              {!editingTitle ? (
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  disabled={disabled || regenBusy}
                  className="shrink-0 text-[12px] font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50"
                >
                  Edit title
                </button>
              ) : (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={saveTitle}
                    className="text-[12px] font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(day.title);
                      setEditingTitle(false);
                    }}
                    className="text-[12px] font-medium text-admin-muted hover:text-admin-fg-strong"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <p className="admin-hint mt-1 text-[12px]">{sermonTitle}</p>
          </div>

          <div className="rounded-lg border border-emerald-500/20 bg-[#050a08] p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
                Member preview
              </p>
              {!showRegenPrompt ? (
                <button
                  type="button"
                  onClick={() => setShowRegenPrompt(true)}
                  disabled={disabled || regenBusy}
                  className="text-[12px] font-medium text-violet-300 hover:text-violet-200 disabled:opacity-50"
                >
                  Regenerate with AI
                </button>
              ) : null}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-admin-muted">Before you read</p>
                {!editingPrePrompt ? (
                  <button
                    type="button"
                    onClick={() => setEditingPrePrompt(true)}
                    disabled={disabled || regenBusy}
                    className="text-[12px] font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={savePrePrompt}
                      className="text-[12px] font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrePrompt(day.pre_prompt);
                        setEditingPrePrompt(false);
                      }}
                      className="text-[12px] font-medium text-admin-muted hover:text-admin-fg-strong"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {editingPrePrompt ? (
                <textarea
                  value={prePrompt}
                  onChange={(e) => setPrePrompt(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  autoFocus
                  className="w-full resize-y rounded-lg border border-[#38bdf8]/40 bg-[#05070a] px-3 py-2 text-[13px] leading-relaxed text-amber-100/90 outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              ) : (
                <p className="text-[13px] leading-relaxed text-amber-100/90">{day.pre_prompt}</p>
              )}
            </div>

            {day.scripture_reference ? (
              <p className="text-[14px] font-medium text-sky-300">{day.scripture_reference}</p>
            ) : null}

            {day.scripture_text ? (
              <p className="text-[13px] leading-relaxed text-admin-fg-secondary whitespace-pre-wrap">
                {day.scripture_text}
              </p>
            ) : null}

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-admin-muted">Body</p>
                {!editingMainContent ? (
                  <button
                    type="button"
                    onClick={() => setEditingMainContent(true)}
                    disabled={disabled || regenBusy}
                    className="text-[12px] font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveMainContent}
                      className="text-[12px] font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMainContent(day.main_content);
                        setEditingMainContent(false);
                      }}
                      className="text-[12px] font-medium text-admin-muted hover:text-admin-fg-strong"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {editingMainContent ? (
                <div className="space-y-1.5">
                  <textarea
                    value={mainContent}
                    onChange={(e) => setMainContent(e.target.value)}
                    rows={10}
                    maxLength={48000}
                    autoFocus
                    className="w-full resize-y rounded-lg border border-[#38bdf8]/40 bg-[#05070a] px-3 py-2 text-[14px] leading-relaxed text-admin-fg outline-none focus:ring-2 focus:ring-sky-400/40"
                  />
                  <p
                    className={`text-[11px] ${
                      editingBodyParagraphCount >= MIN_BODY_PARAGRAPHS
                        ? 'text-admin-dim'
                        : 'text-amber-400/90'
                    }`}
                  >
                    {editingBodyParagraphCount} paragraph
                    {editingBodyParagraphCount === 1 ? '' : 's'} — at least {MIN_BODY_PARAGRAPHS}{' '}
                    required (separate with a blank line)
                  </p>
                </div>
              ) : (
                <div className="text-[14px] leading-relaxed text-admin-fg whitespace-pre-wrap">
                  {day.main_content}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-admin-muted">Reflection question</p>
                {!editingReflection ? (
                  <button
                    type="button"
                    onClick={() => setEditingReflection(true)}
                    disabled={disabled || regenBusy}
                    className="text-[12px] font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveReflection}
                      className="text-[12px] font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReflectionQuestion(day.reflection_question);
                        setEditingReflection(false);
                      }}
                      className="text-[12px] font-medium text-admin-muted hover:text-admin-fg-strong"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {editingReflection ? (
                <textarea
                  value={reflectionQuestion}
                  onChange={(e) => setReflectionQuestion(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  autoFocus
                  className="w-full resize-y rounded-lg border border-[#38bdf8]/40 bg-[#05070a] px-3 py-2 text-[14px] leading-relaxed text-violet-200/95 outline-none focus:ring-2 focus:ring-sky-400/40"
                />
              ) : (
                <p className="text-[14px] leading-relaxed text-violet-200/95">{day.reflection_question}</p>
              )}
            </div>

            <p className="text-[11px] text-admin-dim">About {day.estimated_minutes} min read</p>
          </div>

          {showRegenPrompt ? (
            <div className="rounded-lg border border-violet-500/30 bg-violet-950/20 p-4 space-y-3">
              <p className="text-[13px] font-medium text-violet-200">
                What should change about this day?
              </p>
              <textarea
                value={regenInstruction}
                onChange={(e) => setRegenInstruction(e.target.value)}
                rows={3}
                maxLength={1200}
                disabled={regenBusy}
                placeholder="e.g. Shorter paragraphs, more on prayer, gentler tone…"
                className="w-full resize-y rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 text-[14px] leading-relaxed text-admin-fg outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30 disabled:opacity-60"
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={regenBusy}
                  onClick={() => void regenerateBody()}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {regenBusy ? 'Regenerating…' : 'Regenerate with AI'}
                </button>
                <button
                  type="button"
                  disabled={regenBusy}
                  onClick={() => {
                    setShowRegenPrompt(false);
                    setRegenInstruction('');
                    setError(null);
                  }}
                  className="rounded-lg border border-admin-strong px-4 py-2 text-[13px] text-admin-muted hover:bg-admin-surface disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="text-[13px] text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DevotionalGenerationHints active={regenBusy} variant="single-day" intervalMs={2400} />
      </div>
    </div>
  );
}

type ListProps = {
  churchId: string;
  sermonTitle: string;
  pastorName: string;
  sermonDate: string;
  transcript: string;
  days: DevotionalDay[];
  onDaysChange: (next: DevotionalDay[]) => void;
  disabled?: boolean;
};

export function DevotionalPreviewReviewList({
  churchId,
  sermonTitle,
  pastorName,
  sermonDate,
  transcript,
  days,
  onDaysChange,
  disabled = false,
}: ListProps) {
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);

  const selectedDay = days.find((d) => d.day_number === selectedDayNumber) ?? null;

  function patchDay(updated: DevotionalDay) {
    onDaysChange(days.map((d) => (d.day_number === updated.day_number ? updated : d)));
  }

  return (
    <>
      <ul className="divide-y divide-admin rounded-xl border border-admin bg-admin-surface/50 overflow-hidden">
        {days.map((d) => (
          <li key={d.day_number}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setSelectedDayNumber(d.day_number)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-admin-surface disabled:opacity-50"
            >
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
                Day {d.day_number}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-admin-fg-strong">
                {d.title?.trim() || 'Untitled'}
              </span>
              <span className="shrink-0 text-[12px] text-admin-dim">View</span>
            </button>
          </li>
        ))}
      </ul>

      {selectedDay ? (
        <DevotionalDayReviewModal
          day={selectedDay}
          sermonTitle={sermonTitle}
          churchId={churchId}
          pastorName={pastorName}
          sermonDate={sermonDate}
          transcript={transcript}
          siblingPrePrompts={days
            .filter((d) => d.day_number !== selectedDay.day_number)
            .map((d) => d.pre_prompt)}
          onClose={() => setSelectedDayNumber(null)}
          onDayChange={patchDay}
          disabled={disabled}
        />
      ) : null}
    </>
  );
}
