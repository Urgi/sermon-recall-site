/** Prompts for OpenAI six-day generation and single-day regeneration. */

export function buildSixDayGenerationPrompt(params: {
  sermonTitle: string;
  pastorName: string | null;
  sermonDate: string | null;
  transcript: string;
}): string {
  const meta = [
    params.sermonTitle && `Sermon title: ${params.sermonTitle}`,
    params.pastorName && `Speaker: ${params.pastorName}`,
    params.sermonDate && `Date (if known): ${params.sermonDate}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `You create faithful, encouraging Protestant devotionals for church members based ONLY on the sermon content below.

${meta}

Requirements:
- Output EXACTLY 6 devotionals (days 1 through 6).
- Day 1 should welcome people into the theme; days 2–5 deepen application; day 6 sends people forward with hope and one concrete commitment.
- Tone: warm, clear, non-academic, suitable for busy adults (~3–6 minute read each).
- Each day needs a distinct title (include "Day N —" prefix in the title).
- Scripture: prefer one primary reference per day in scripture_reference; optional short scripture_text quote if it fits (may be null).
- main_content: 2–4 short paragraphs per day (plain text, no markdown headings). Separate each paragraph with a blank line.
- reflection_question: one open question for journaling or discussion.
- estimated_minutes: integer 3–6.
- pre_prompt (REQUIRED for every day): one short sentence the member answers from memory BEFORE reading that day’s main_content. Ground it in the sermon transcript and in that day’s specific angle (title/theme)—not generic filler. It must be a retrieval question (recall, paraphrase, or “what did the preacher say about…”), not a preview of the reading. Do not copy or closely paraphrase sentences from main_content; do not quote scripture you will show later. Use a different angle than the reflection_question. All six pre_prompt strings must be clearly different from each other (no duplicates or near-duplicates).

Return ONLY valid JSON (no markdown fences): an object with key "days" containing an array of exactly 6 objects. Each object has these keys:
day_number (number 1-6), title (string), main_content (string), scripture_reference (string or null), scripture_text (string or null), reflection_question (string), estimated_minutes (number), pre_prompt (string — required, non-empty for every day).

--- SERMON SOURCE ---
${params.transcript}`;
}

export function buildSingleDayRegenerationPrompt(params: {
  sermonTitle: string;
  pastorName: string | null;
  sermonDate: string | null;
  transcript: string;
  dayNumber: number;
  currentDayJson: string;
  otherDaysPrePrompts: string[];
  instruction: string;
}): string {
  const meta = [
    params.sermonTitle && `Sermon title: ${params.sermonTitle}`,
    params.pastorName && `Speaker: ${params.pastorName}`,
    params.sermonDate && `Date (if known): ${params.sermonDate}`,
  ]
    .filter(Boolean)
    .join('\n');

  const siblings =
    params.otherDaysPrePrompts.length > 0
      ? params.otherDaysPrePrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')
      : '(none)';

  return `You revise ONE devotional day for a church member app. Output must stay faithful to the sermon transcript and Protestant devotional tone (warm, clear, non-academic).

${meta}

The member flow for this day: they see a short pre_prompt (memory retrieval), then optional scripture, then main_content, then a reflection_question.

Other days already use these pre_prompt texts — your new pre_prompt for day ${params.dayNumber} must be clearly different from all of them (no duplicate or near-duplicate):
${siblings}

Current day ${params.dayNumber} (JSON — replace with your improved version):
${params.currentDayJson}

Pastor instructions (follow closely):
${params.instruction}

Rules:
- Return ONLY valid JSON (no markdown fences): one object with keys day_number, title, main_content, scripture_reference (string or null), scripture_text (string or null), reflection_question, estimated_minutes (integer 3–6), pre_prompt (required string).
- day_number must be exactly ${params.dayNumber}.
- main_content: 2–4 short paragraphs separated by blank lines.
- pre_prompt: one short retrieval question from memory before reading; must not preview main_content; must differ from reflection_question; must differ from every sibling pre_prompt above.

--- SERMON SOURCE ---
${params.transcript}`;
}
