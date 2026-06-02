/** Shape returned by AI generation and accepted by publish API (no DB ids). */

export type DevotionalDay = {
  day_number: number;
  title: string;
  main_content: string;
  scripture_reference: string | null;
  scripture_text: string | null;
  reflection_question: string;
  estimated_minutes: number;
  /** Short retrieval question answered before reading the day’s content (required; distinct per day). */
  pre_prompt: string;
};

/** @deprecated Use DevotionalDay — kept for gradual import renames. */
export type GeminiDevotionalDay = DevotionalDay;

const MAX_TITLE = 600;
const MAX_MAIN = 48_000;
const MAX_SCRIPTURE_REF = 400;
const MAX_SCRIPTURE_TEXT = 8_000;
const MAX_REFLECTION = 2_000;
const MAX_PRE_PROMPT = 2_000;

/** Minimum paragraphs in main_content (blank line between paragraphs). */
export const MIN_BODY_PARAGRAPHS = 2;

export function countBodyParagraphs(text: string): number {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

export function validateBodyParagraphs(
  text: string,
  min: number = MIN_BODY_PARAGRAPHS,
): string | null {
  const count = countBodyParagraphs(text);
  if (count < min) {
    return `Body needs at least ${min} paragraphs (separate with a blank line). Currently ${count}.`;
  }
  return null;
}

/** Coerce AI output into blank-line-separated paragraphs when possible. */
export function normalizeBodyParagraphs(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (countBodyParagraphs(trimmed) >= MIN_BODY_PARAGRAPHS) {
    return trimmed;
  }

  const singleNewlineBlocks = trimmed
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (singleNewlineBlocks.length >= MIN_BODY_PARAGRAPHS) {
    return singleNewlineBlocks.join('\n\n');
  }

  if (singleNewlineBlocks.length === 1) {
    const sentences =
      singleNewlineBlocks[0].match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)?.map((s) => s.trim()) ??
      [];
    if (sentences.length >= MIN_BODY_PARAGRAPHS) {
      const mid = Math.ceil(sentences.length / 2);
      return [sentences.slice(0, mid).join(' '), sentences.slice(mid).join(' ')].join('\n\n');
    }
  }

  return trimmed;
}

export function clampMinutes(n: number | undefined): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 4;
  return Math.min(12, Math.max(3, Math.round(n)));
}

function unwrapDaysPayload(parsed: unknown): unknown {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const days = (parsed as { days?: unknown }).days;
    if (Array.isArray(days)) return days;
  }
  return parsed;
}

/** Parse model JSON string. */
export function parseDaysFromModelJson(raw: string): DevotionalDay[] {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/m, '');
  }
  const parsed = JSON.parse(text) as unknown;
  return normalizeDaysArray(unwrapDaysPayload(parsed));
}

/** Validate body from client before insert. */
export function parseDaysFromClientPayload(days: unknown): DevotionalDay[] {
  return normalizeDaysArray(days);
}

/** Parse a single day from model JSON (regenerate-one-day API). */
export function parseSingleDayFromModelJson(raw: string, expectedDayNumber: number): DevotionalDay {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/m, '');
  }
  const parsed = JSON.parse(text) as unknown;
  const day =
    parsed && typeof parsed === 'object' && 'day' in (parsed as object)
      ? (parsed as { day: unknown }).day
      : parsed;
  return normalizeSingleDay(day, expectedDayNumber);
}

function normalizeSingleDay(item: unknown, expectedDayNumber: number): DevotionalDay {
  if (!item || typeof item !== 'object') {
    throw new Error('Expected a devotional day object.');
  }
  const row = item as Record<string, unknown>;
  const n =
    typeof row.day_number === 'number' && row.day_number >= 1 && row.day_number <= 6
      ? row.day_number
      : expectedDayNumber;

  const title = typeof row.title === 'string' ? row.title.trim() : '';
  const main_content = normalizeBodyParagraphs(
    typeof row.main_content === 'string' ? row.main_content.trim() : '',
  );
  const reflection_question =
    typeof row.reflection_question === 'string' ? row.reflection_question.trim() : '';
  const pre_prompt_raw = typeof row.pre_prompt === 'string' ? row.pre_prompt.trim() : '';
  if (!title || !main_content || !reflection_question || !pre_prompt_raw) {
    throw new Error(`Day ${n} is missing title, main_content, reflection_question, or pre_prompt.`);
  }
  if (title.length > MAX_TITLE) throw new Error(`Day ${n} title is too long.`);
  if (main_content.length > MAX_MAIN) throw new Error(`Day ${n} content is too long.`);
  const bodyParagraphError = validateBodyParagraphs(main_content);
  if (bodyParagraphError) throw new Error(`Day ${n}: ${bodyParagraphError}`);
  if (reflection_question.length > MAX_REFLECTION) {
    throw new Error(`Day ${n} reflection question is too long.`);
  }
  if (pre_prompt_raw.length > MAX_PRE_PROMPT) {
    throw new Error(`Day ${n} pre_prompt is too long.`);
  }

  let scripture_reference: string | null = null;
  if (row.scripture_reference != null) {
    if (typeof row.scripture_reference !== 'string') {
      throw new Error(`Day ${n} scripture_reference must be a string or null.`);
    }
    const s = row.scripture_reference.trim();
    scripture_reference = s || null;
    if (scripture_reference && scripture_reference.length > MAX_SCRIPTURE_REF) {
      throw new Error(`Day ${n} scripture reference is too long.`);
    }
  }

  let scripture_text: string | null = null;
  if (row.scripture_text != null) {
    if (typeof row.scripture_text !== 'string') {
      throw new Error(`Day ${n} scripture_text must be a string or null.`);
    }
    const s = row.scripture_text.trim();
    scripture_text = s || null;
    if (scripture_text && scripture_text.length > MAX_SCRIPTURE_TEXT) {
      throw new Error(`Day ${n} scripture text is too long.`);
    }
  }

  return {
    day_number: n,
    title,
    main_content,
    scripture_reference,
    scripture_text,
    reflection_question,
    estimated_minutes: clampMinutes(
      typeof row.estimated_minutes === 'number' ? row.estimated_minutes : undefined,
    ),
    pre_prompt: pre_prompt_raw,
  };
}

function normalizeDaysArray(parsed: unknown): DevotionalDay[] {
  if (!Array.isArray(parsed)) {
    throw new Error('Expected an array of 6 devotionals.');
  }
  if (parsed.length !== 6) {
    throw new Error(`Expected 6 devotionals, got ${parsed.length}.`);
  }
  const out: DevotionalDay[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown>;
    if (!item || typeof item.day_number !== 'number') {
      throw new Error(`Invalid devotional at index ${i}.`);
    }
    const n = item.day_number;
    if (n < 1 || n > 6) throw new Error(`Invalid day_number ${n}.`);
    if (seen.has(n)) throw new Error(`Duplicate day_number ${n}.`);
    seen.add(n);

    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const main_content = normalizeBodyParagraphs(
      typeof item.main_content === 'string' ? item.main_content.trim() : '',
    );
    const reflection_question =
      typeof item.reflection_question === 'string' ? item.reflection_question.trim() : '';
    const pre_prompt_raw =
      typeof item.pre_prompt === 'string' ? item.pre_prompt.trim() : '';
    if (!title || !main_content || !reflection_question || !pre_prompt_raw) {
      throw new Error(
        `Day ${n} is missing title, main_content, reflection_question, or pre_prompt.`,
      );
    }
    if (title.length > MAX_TITLE) throw new Error(`Day ${n} title is too long.`);
    if (main_content.length > MAX_MAIN) throw new Error(`Day ${n} content is too long.`);
    const bodyParagraphError = validateBodyParagraphs(main_content);
    if (bodyParagraphError) throw new Error(`Day ${n}: ${bodyParagraphError}`);
    if (reflection_question.length > MAX_REFLECTION) {
      throw new Error(`Day ${n} reflection question is too long.`);
    }

    let scripture_reference: string | null = null;
    if (item.scripture_reference != null) {
      if (typeof item.scripture_reference !== 'string') {
        throw new Error(`Day ${n} scripture_reference must be a string or null.`);
      }
      const s = item.scripture_reference.trim();
      scripture_reference = s || null;
      if (scripture_reference && scripture_reference.length > MAX_SCRIPTURE_REF) {
        throw new Error(`Day ${n} scripture reference is too long.`);
      }
    }

    let scripture_text: string | null = null;
    if (item.scripture_text != null) {
      if (typeof item.scripture_text !== 'string') {
        throw new Error(`Day ${n} scripture_text must be a string or null.`);
      }
      const s = item.scripture_text.trim();
      scripture_text = s || null;
      if (scripture_text && scripture_text.length > MAX_SCRIPTURE_TEXT) {
        throw new Error(`Day ${n} scripture text is too long.`);
      }
    }

    const estimated_minutes = clampMinutes(
      typeof item.estimated_minutes === 'number' ? item.estimated_minutes : undefined,
    );

    const pre_prompt = pre_prompt_raw;
    if (pre_prompt.length > MAX_PRE_PROMPT) {
      throw new Error(`Day ${n} pre_prompt is too long.`);
    }

    out.push({
      day_number: n,
      title,
      main_content,
      scripture_reference,
      scripture_text,
      reflection_question,
      estimated_minutes,
      pre_prompt,
    });
  }
  for (let d = 1; d <= 6; d++) {
    if (!seen.has(d)) throw new Error(`Missing day ${d}.`);
  }
  out.sort((a, b) => a.day_number - b.day_number);

  const lowerPrompts = out.map((d) => d.pre_prompt.toLowerCase());
  const unique = new Set(lowerPrompts);
  if (unique.size < 6) {
    throw new Error(
      'Each day must have a distinct pre_prompt (no duplicate retrieval questions).',
    );
  }

  return out;
}
