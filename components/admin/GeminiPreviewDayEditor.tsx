'use client';

import type { DevotionalDay } from '@/lib/devotionals/devotional-days';

type Props = {
  sermonTitle: string;
  day: DevotionalDay;
  onPatch: (patch: Partial<DevotionalDay>) => void;
  defaultOpen?: boolean;
  /** Use `block` when nesting inside another list item (e.g. new sermon wizard). */
  variant?: 'list-item' | 'block';
};

export function GeminiPreviewDayEditor({
  sermonTitle,
  day,
  onPatch,
  defaultOpen = false,
  variant = 'list-item',
}: Props) {
  const Wrapper = variant === 'list-item' ? 'li' : 'div';
  return (
    <Wrapper className="rounded-lg border border-admin bg-admin-surface p-0 overflow-hidden">
      <details className="group" open={defaultOpen}>
        <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
              Day {day.day_number}
              <span className="ml-2 font-normal normal-case text-admin-muted">
                {(day.title || 'Untitled').length > 72
                  ? `${(day.title || '').slice(0, 72)}…`
                  : day.title || 'Untitled'}
              </span>
            </p>
            <span className="text-[11px] font-medium text-violet-300 group-open:hidden">
              Edit before publish
            </span>
            <span className="text-[11px] font-medium text-violet-200 hidden group-open:inline">
              Editing
            </span>
          </div>
          <p className="mt-1 text-[12px] text-admin-dim">{sermonTitle}</p>
        </summary>

        <div className="space-y-4 border-t border-[rgba(56,189,248,0.08)] px-4 pb-4 pt-4">
          <div>
            <label className="block text-[13px] font-medium text-admin-muted">Day title</label>
            <input
              type="text"
              value={day.title}
              onChange={(e) => onPatch({ title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 text-[15px] text-admin-fg outline-none focus:border-[#38bdf8] focus:ring-2 ring-sky-400/40"
              maxLength={600}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-admin-muted">
              Pre-session retrieval (required — must differ each day)
            </label>
            <textarea
              value={day.pre_prompt}
              onChange={(e) => onPatch({ pre_prompt: e.target.value })}
              rows={3}
              maxLength={2000}
              className="mt-1 w-full resize-y rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 text-[14px] leading-relaxed text-admin-fg outline-none focus:border-[#38bdf8] focus:ring-2 ring-sky-400/40"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-admin-muted">Scripture reference</label>
            <input
              type="text"
              value={day.scripture_reference ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onPatch({ scripture_reference: v.trim() === '' ? null : v });
              }}
              className="mt-1 w-full rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 text-[15px] text-admin-fg outline-none focus:border-[#38bdf8] focus:ring-2 ring-sky-400/40"
              maxLength={400}
              placeholder="e.g. John 3:16"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-admin-muted">Scripture text (optional)</label>
            <textarea
              value={day.scripture_text ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onPatch({ scripture_text: v.trim() === '' ? null : v });
              }}
              rows={4}
              maxLength={8000}
              className="mt-1 w-full resize-y rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 text-[14px] leading-relaxed text-admin-fg outline-none focus:border-[#38bdf8] focus:ring-2 ring-sky-400/40"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-admin-muted">Main content</label>
            <textarea
              value={day.main_content}
              onChange={(e) => onPatch({ main_content: e.target.value })}
              rows={10}
              maxLength={48000}
              className="mt-1 w-full resize-y rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 font-[system-ui] text-[14px] leading-relaxed text-admin-fg outline-none focus:border-[#38bdf8] focus:ring-2 ring-sky-400/40"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-admin-muted">Reflection question</label>
            <textarea
              value={day.reflection_question}
              onChange={(e) => onPatch({ reflection_question: e.target.value })}
              rows={3}
              maxLength={2000}
              className="mt-1 w-full resize-y rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 text-[14px] leading-relaxed text-admin-fg outline-none focus:border-[#38bdf8] focus:ring-2 ring-sky-400/40"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-admin-muted">
              Estimated minutes (3–12)
            </label>
            <input
              type="number"
              min={3}
              max={12}
              value={day.estimated_minutes}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isNaN(n)) return;
                onPatch({ estimated_minutes: Math.min(12, Math.max(3, Math.round(n))) });
              }}
              className="mt-1 w-24 rounded-lg border border-admin-strong bg-admin-surface px-3 py-2 text-[15px] text-admin-fg outline-none focus:border-[#38bdf8] focus:ring-2 ring-sky-400/40"
            />
          </div>
        </div>
      </details>
    </Wrapper>
  );
}
