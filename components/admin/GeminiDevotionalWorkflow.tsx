'use client';

import type { GeminiDevotionalDay } from '@/lib/gemini/devotional-days';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  sermonId: string;
  sermonTitle: string;
  hasTranscript: boolean;
  hasExistingDevotionals: boolean;
};

const EXCERPT = 180;

export function GeminiDevotionalWorkflow({
  sermonId,
  sermonTitle,
  hasTranscript,
  hasExistingDevotionals,
}: Props) {
  const router = useRouter();
  const [previewDays, setPreviewDays] = useState<GeminiDevotionalDay[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generatePreview() {
    if (!hasTranscript) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-devotionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ sermonId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        days?: GeminiDevotionalDay[];
      };
      if (!res.ok) {
        const msg = data.error ?? 'Generation failed.';
        setError(data.hint ? `${msg} ${data.hint}` : msg);
        return;
      }
      if (!data.days || !Array.isArray(data.days)) {
        setError('Unexpected response from server.');
        return;
      }
      setPreviewDays(data.days);
    } finally {
      setGenerating(false);
    }
  }

  async function publish() {
    if (!previewDays?.length) return;
    if (hasExistingDevotionals) {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm(
          'Replace the six devotionals already in the app with this preview? Members will see the new content.',
        );
      if (!ok) return;
    }
    setError(null);
    setPublishing(true);
    try {
      const res = await fetch('/api/publish-devotionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          sermonId,
          days: previewDays,
          replace: hasExistingDevotionals,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Publish failed.');
        return;
      }
      setPreviewDays(null);
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  function discardPreview() {
    setPreviewDays(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {!previewDays ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void generatePreview()}
            disabled={generating || !hasTranscript}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? 'Generating preview…' : 'Generate preview with Gemini'}
          </button>
          {!hasTranscript ? (
            <p className="text-[12px] text-amber-200/90">
              Add sermon script or notes on this page first.
            </p>
          ) : (
            <p className="text-[12px] leading-relaxed text-[#64748b]">
              Nothing is saved to the app until you publish. Review the six days, then use{' '}
              <span className="text-[#94a3b8]">Publish to app</span>.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-violet-500/25 bg-[#0a0f18] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-violet-200">Preview (not live yet)</p>
              <p className="mt-1 text-[12px] text-[#64748b]">
                Members still see the previous version until you publish. You can edit titles and
                lines on each card below after publishing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void generatePreview()}
              disabled={generating}
              className="text-[13px] font-medium text-violet-300 hover:text-violet-200 disabled:opacity-50"
            >
              {generating ? 'Regenerating…' : 'Regenerate preview'}
            </button>
          </div>

          <ul className="space-y-3">
            {previewDays.map((d) => (
              <li
                key={d.day_number}
                className="rounded-lg border border-[rgba(56,189,248,0.12)] bg-[#05070a] p-4"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
                  Day {d.day_number}
                </p>
                <p className="mt-1 text-[12px] text-[#64748b]">{sermonTitle}</p>
                <p className="mt-2 text-[16px] font-semibold text-white">{d.title}</p>
                {d.scripture_reference ? (
                  <p className="mt-1 text-[13px] font-medium text-sky-300">{d.scripture_reference}</p>
                ) : null}
                <p className="mt-2 text-[13px] leading-relaxed text-[#94a3b8]">
                  {d.main_content.length > EXCERPT
                    ? `${d.main_content.slice(0, EXCERPT).trim()}…`
                    : d.main_content}
                </p>
                <p className="mt-2 text-[12px] text-[#64748b]">
                  Reflection: {d.reflection_question.slice(0, 120)}
                  {d.reflection_question.length > 120 ? '…' : ''}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void publish()}
              disabled={publishing}
              className="rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#0284c7] disabled:opacity-60"
            >
              {publishing ? 'Publishing…' : 'Publish to app'}
            </button>
            <button
              type="button"
              onClick={discardPreview}
              disabled={publishing}
              className="rounded-lg border border-[rgba(56,189,248,0.25)] px-4 py-2.5 text-[14px] text-[#94a3b8] hover:bg-[#05070a] disabled:opacity-50"
            >
              Discard preview
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="max-w-xl text-[13px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
