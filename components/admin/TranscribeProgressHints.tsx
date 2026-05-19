'use client';

import { useEffect, useState } from 'react';

import type { TranscribePhase } from '@/lib/transcribe-progress-estimate';

export const TRANSCRIBE_UPLOAD_HINTS = [
  'Sending your recording to secure storage…',
  'Preparing the file for transcription…',
  'Hang tight — upload usually finishes in a few seconds…',
] as const;

export const TRANSCRIBE_WHISPER_HINTS = [
  'Listening for sermon themes and key phrases…',
  'Turning speech into text your church can search…',
  'Aligning punctuation and paragraphs for readability…',
  'Catching names, references, and emphasis from the audio…',
  'Longer recordings can take a few minutes — still working…',
  'Almost there — saving the transcript to your sermon…',
] as const;

type Props = {
  phase: TranscribePhase;
  className?: string;
  intervalMs?: number;
};

export function TranscribeProgressHints({ phase, className = '', intervalMs = 2800 }: Props) {
  const lines = phase === 'upload' ? TRANSCRIBE_UPLOAD_HINTS : TRANSCRIBE_WHISPER_HINTS;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [phase]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % lines.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [lines.length, intervalMs]);

  return (
    <p
      key={`${phase}-${index}`}
      className={`text-[13px] leading-snug text-sky-200/80 motion-safe:animate-hintFade ${className}`.trim()}
    >
      {lines[index]}
    </p>
  );
}
