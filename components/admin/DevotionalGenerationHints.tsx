'use client';

import { useEffect, useState } from 'react';

/** Shown while AI builds or rebuilds the six-day set. */
export const DEVOTIONAL_GENERATION_HINTS = [
  'Grounding each day in your sermon…',
  'Tuning tone for a clear, encouraging read…',
  'Weaving Scripture where it fits the six-day arc…',
  'Shaping distinct memory prompts for each day…',
  'Aligning titles and pacing for busy readers…',
  'Crafting reflection questions for journaling…',
  'Structuring the week from welcome to send-off…',
] as const;

/** Shown while a single day is being regenerated. */
export const DEVOTIONAL_DAY_REGEN_HINTS = [
  'Re-reading your sermon for this day’s angle…',
  'Adjusting tone and length for members…',
  'Checking Scripture and prompts stay distinct…',
  'Polishing the reflection question…',
] as const;

type Props = {
  active: boolean;
  /** Preset lines for six-day runs vs one-day refresh. */
  variant?: 'six-day' | 'single-day';
  /** Override preset lines (e.g. custom copy). */
  lines?: readonly string[];
  className?: string;
  /** Override interval between rotations (ms). */
  intervalMs?: number;
};

export function DevotionalGenerationHints({
  active,
  variant = 'six-day',
  lines: linesOverride,
  className = '',
  intervalMs = 2800,
}: Props) {
  const lines =
    linesOverride ??
    (variant === 'single-day' ? DEVOTIONAL_DAY_REGEN_HINTS : DEVOTIONAL_GENERATION_HINTS);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % lines.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [active, lines.length, intervalMs]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`min-h-[2.5rem] max-w-lg pt-1 ${className}`.trim()}
    >
      <p key={index} className="text-[13px] leading-snug text-sky-200/85 motion-safe:animate-hintFade">
        {lines[index]}
      </p>
    </div>
  );
}
