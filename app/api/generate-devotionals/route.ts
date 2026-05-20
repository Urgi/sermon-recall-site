import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

import { canRegenerateWorkflow } from '@/lib/admin/workflow-status';
import type { SermonWorkflowStatus } from '@/lib/admin/workflow-status';
import { authorizeApiPermission } from '@/lib/auth/server';
import type { GeminiDevotionalDay } from '@/lib/gemini/devotional-days';
import { parseDaysFromModelJson } from '@/lib/gemini/devotional-days';
import { checkRateLimit } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_TRANSCRIPT_CHARS = 120_000;

function envApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    null
  );
}

const DEFAULT_MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
] as const;

function geminiModelCandidates(): string[] {
  const explicit = process.env.GEMINI_MODEL?.trim();
  if (explicit) return [explicit];
  return [...DEFAULT_MODEL_CANDIDATES];
}

function isModelNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('404') && err.message.includes('models/');
}

function buildPrompt(params: {
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
- main_content: 2–4 short paragraphs per day (plain text, no markdown headings).
- reflection_question: one open question for journaling or discussion.
- estimated_minutes: integer 3–6.
- pre_prompt (REQUIRED for every day): one short sentence the member answers from memory BEFORE reading that day’s main_content. Ground it in the sermon transcript and in that day’s specific angle (title/theme)—not generic filler. It must be a retrieval question (recall, paraphrase, or “what did the preacher say about…”), not a preview of the reading. Do not copy or closely paraphrase sentences from main_content; do not quote scripture you will show later. Use a different angle than the reflection_question. All six pre_prompt strings must be clearly different from each other (no duplicates or near-duplicates).

Return ONLY valid JSON (no markdown fences): an array of 6 objects with these keys:
day_number (number 1-6), title (string), main_content (string), scripture_reference (string or null), scripture_text (string or null), reflection_question (string), estimated_minutes (number), pre_prompt (string — required, non-empty for every day).

--- SERMON SOURCE ---
${params.transcript}`;
}

/**
 * Preview only: calls Gemini and returns days. Does not write to the database.
 */
export async function POST(req: Request) {
  const apiKey = envApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server missing GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY).' },
      { status: 500 },
    );
  }

  let body: { sermonId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sermonId = typeof body.sermonId === 'string' ? body.sermonId.trim() : '';
  if (!sermonId) {
    return NextResponse.json({ error: 'sermonId is required.' }, { status: 400 });
  }

  const auth = await authorizeApiPermission('can_generate_devotionals');
  if (!auth.ok) return auth.response;

  const limit = await checkRateLimit(`gemini:${auth.ctx.user.id}`, 15, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Generation rate limit reached. Try again later.' }, { status: 429 });
  }

  const supabase = createServerSupabaseClient();
  const profileRow = auth.ctx.profile;

  const { data: sermon, error: sermonError } = await supabase
    .from('sermons')
    .select('id, church_id, title, pastor_name, sermon_date, transcript, workflow_status')
    .eq('id', sermonId)
    .single();

  if (sermonError || !sermon) {
    return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 });
  }

  if (sermon.church_id !== profileRow.church_id) {
    return NextResponse.json({ error: 'This sermon belongs to another church.' }, { status: 403 });
  }

  const wf = (sermon.workflow_status as SermonWorkflowStatus) ?? 'draft';
  if (!canRegenerateWorkflow(wf)) {
    return NextResponse.json(
      { error: 'Cannot regenerate while sermon is in review or published.' },
      { status: 409 },
    );
  }

  const transcript = (sermon.transcript as string | null)?.trim() ?? '';
  if (!transcript) {
    return NextResponse.json(
      { error: 'Add sermon script or notes before generating devotionals.' },
      { status: 400 },
    );
  }

  const transcriptSlice =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? `${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}\n\n[Truncated for generation.]`
      : transcript;

  const prompt = buildPrompt({
    sermonTitle: sermon.title as string,
    pastorName: (sermon.pastor_name as string | null) ?? null,
    sermonDate: (sermon.sermon_date as string | null) ?? null,
    transcript: transcriptSlice,
  });

  const candidates = geminiModelCandidates();
  const explicitModel = Boolean(process.env.GEMINI_MODEL?.trim());
  const genAI = new GoogleGenerativeAI(apiKey);
  let days: GeminiDevotionalDay[] | undefined;

  for (let i = 0; i < candidates.length; i++) {
    const modelId = candidates[i];
    try {
      const model = genAI.getGenerativeModel({
        model: modelId,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) throw new Error('Empty response from model.');
      days = parseDaysFromModelJson(text);
      break;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const canRetry =
        !explicitModel && isModelNotFoundError(e) && i < candidates.length - 1;
      if (canRetry) continue;
      return NextResponse.json(
        {
          error: err.message,
          hint: explicitModel
            ? 'Confirm GEMINI_MODEL matches a model ID from Google AI Studio for this API key.'
            : `Tried: ${candidates.slice(0, i + 1).join(' → ')}. Set GEMINI_MODEL in site/.env to an ID from AI Studio if needed.`,
        },
        { status: 502 },
      );
    }
  }

  if (!days) {
    return NextResponse.json({ error: 'Generation failed.' }, { status: 502 });
  }

  await supabase
    .from('sermons')
    .update({ workflow_status: 'generated' })
    .eq('id', sermonId);

  return NextResponse.json({ ok: true, days });
}
