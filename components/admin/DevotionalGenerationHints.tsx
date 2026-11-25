'use client';

import { useEffect, useState } from 'react';

import { useLanguage } from '@/components/i18n/LanguageProvider';

/** Shown while AI builds or rebuilds the six-day set. */
export const DEVOTIONAL_GENERATION_HINTS = ['hint.g1', 'hint.g2', 'hint.g3', 'hint.g4', 'hint.g5', 'hint.g6', 'hint.g7'] as const;

/** Shown while a single day is being regenerated. */
export const DEVOTIONAL_DAY_REGEN_HINTS = ['hint.s1', 'hint.s2', 'hint.s3', 'hint.s4'] as const;

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
  const { t } = useLanguage();
  const keys = variant === 'single-day' ? DEVOTIONAL_DAY_REGEN_HINTS : DEVOTIONAL_GENERATION_HINTS;
  const lines = linesOverride ?? keys.map((k) => t(k));
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
      <p key={index} className="text-[13px] leading-snug font-medium text-sky-700 dark:text-sky-300 motion-safe:animate-hintFade">
        {lines[index]}
      </p>
    </div>
  );
}
