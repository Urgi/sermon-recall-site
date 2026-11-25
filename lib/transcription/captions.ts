/**
 * Turn a caption file (YouTube Studio download or any subtitle export) into readable sermon text.
 * Runs in the browser; nothing is uploaded. Supports SubRip (.srt), WebVTT (.vtt) and SubViewer (.sbv).
 */

import { PDF_MAX_CHARS } from '@/lib/transcription/pdf-limits';

/** Caption files are tiny (an hour of captions is ~100 KB); anything bigger is not a caption file. */
export const CAPTION_MAX_BYTES = 5 * 1024 * 1024;
export const CAPTION_MAX_MB = CAPTION_MAX_BYTES / (1024 * 1024);

const CAPTION_EXTENSIONS = ['.srt', '.vtt', '.sbv'] as const;

export const CAPTION_ACCEPT = '.srt,.vtt,.sbv,text/vtt,application/x-subrip';

export type CaptionError = 'empty_file' | 'too_large' | 'no_text';

export type CaptionResult =
  | { ok: true; text: string; cues: number; truncated: boolean }
  | { ok: false; code: CaptionError };

export function isCaptionFile(file: Pick<File, 'name' | 'type'>): boolean {
  const name = file.name.toLowerCase();
  return (
    CAPTION_EXTENSIONS.some((ext) => name.endsWith(ext)) ||
    file.type === 'text/vtt' ||
    file.type === 'application/x-subrip'
  );
}

/** UTF-8 first; files saved by older Windows tools fall back to Windows-1252 instead of showing "Ã©". */
export function decodeCaptionBytes(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

// 00:01:02,500 --> 00:01:04,000 (SRT) · 01:02.500 --> 01:04.000 align:start (VTT)
const ARROW_TIMING = /^\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})/;
// 0:01:02.500,0:01:04.000 (SBV)
const SBV_TIMING = /^\s*(\d+:\d{2}:\d{2}\.\d{1,3}),(\d+:\d{2}:\d{2}\.\d{1,3})\s*$/;

function toSeconds(stamp: string): number {
  const parts = stamp.replace(',', '.').split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** Inline markup: <c.colorE5E5E5>, <00:00:01.000>, <v Pastor>, <i>, HTML entities. */
function cleanLine(line: string): string {
  return line
    .replace(/<[^>]*>/g, '')
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, '’')
    .replace(/&quot;/gi, '"')
    .replace(/^\s*-\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type Cue = { start: number; text: string };

function parseCues(raw: string): Cue[] {
  const lines = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const cues: Cue[] = [];
  let current: Cue | null = null;
  let skipBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) cues.push(current);
      current = null;
      skipBlock = false;
      continue;
    }
    if (skipBlock) continue;
    // WebVTT header and metadata blocks carry no spoken text.
    if (/^WEBVTT\b/.test(trimmed) || /^(NOTE|STYLE|REGION)\b/.test(trimmed)) {
      skipBlock = true;
      continue;
    }
    const timing = trimmed.match(ARROW_TIMING) ?? trimmed.match(SBV_TIMING);
    if (timing) {
      if (current) cues.push(current);
      current = { start: toSeconds(timing[1]), text: '' };
      continue;
    }
    // Cue numbers (SRT) and cue identifiers before a timing line.
    if (!current) continue;
    const text = cleanLine(trimmed);
    if (text) current.text = current.text ? `${current.text} ${text}` : text;
  }
  if (current) cues.push(current);
  return cues.filter((cue) => cue.text);
}

/**
 * Auto-generated YouTube captions repeat words as each line scrolls in
 * ("and so we" / "and so we come to"). Drop the longest run of words where the end of the
 * previous cue matches the start of this one, keeping only what is new.
 */
function dropRollUpRepeats(cues: Cue[]): Cue[] {
  const out: Cue[] = [];
  let prevWords: string[] = [];
  for (const cue of cues) {
    const words = cue.text.split(' ');
    let overlap = 0;
    for (let k = Math.min(prevWords.length, words.length); k > 0; k -= 1) {
      // One shared word is usually real speech ("Amen. Amen."), not a scrolled line.
      if (k < 2 && k < prevWords.length) break;
      if (prevWords.slice(-k).join(' ') === words.slice(0, k).join(' ')) {
        overlap = k;
        break;
      }
    }
    const rest = words.slice(overlap).join(' ');
    if (rest) out.push({ start: cue.start, text: rest });
    prevWords = words;
  }
  return out;
}

/** New paragraph after a pause in speech, or once a paragraph is long and a sentence ends. */
function toParagraphs(cues: Cue[]): string {
  const paragraphs: string[] = [];
  let current = '';
  let lastStart = cues[0]?.start ?? 0;
  for (const cue of cues) {
    const pause = cue.start - lastStart > 6;
    const longAndDone = current.length > 600 && /[.!?…"”»]$/.test(current);
    if (current && (pause || longAndDone)) {
      paragraphs.push(current);
      current = '';
    }
    current = current ? `${current} ${cue.text}` : cue.text;
    lastStart = cue.start;
  }
  if (current) paragraphs.push(current);
  return paragraphs.join('\n\n');
}

export function captionsToText(raw: string): CaptionResult {
  if (!raw.trim()) return { ok: false, code: 'empty_file' };
  const cues = dropRollUpRepeats(parseCues(raw));
  if (cues.length === 0) return { ok: false, code: 'no_text' };
  const full = toParagraphs(cues);
  const truncated = full.length > PDF_MAX_CHARS;
  return { ok: true, text: truncated ? full.slice(0, PDF_MAX_CHARS) : full, cues: cues.length, truncated };
}

export async function readCaptionFile(file: File): Promise<CaptionResult> {
  if (file.size === 0) return { ok: false, code: 'empty_file' };
  if (file.size > CAPTION_MAX_BYTES) return { ok: false, code: 'too_large' };
  return captionsToText(decodeCaptionBytes(await file.arrayBuffer()));
}
